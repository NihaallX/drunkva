import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL="([^"]+)"/)?.[1];
const sql = neon(dbUrl);

// 1. Add morning_card_notified_at to sessions
await sql`
  ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS morning_card_notified_at TIMESTAMPTZ
`;
console.log('Added morning_card_notified_at to sessions');

// 2. Add unique constraint on session_witnesses (session_id, user_id) if not exists
await sql`
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name='session_witnesses' AND constraint_type='UNIQUE'
    ) THEN
      ALTER TABLE session_witnesses ADD CONSTRAINT session_witnesses_unique UNIQUE (session_id, user_id);
    END IF;
  END $$
`;
console.log('Added unique constraint to session_witnesses');

// 3. Add personal best columns to users
await sql`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS pb_beer_seconds INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pb_shot_seconds INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pb_wine_seconds INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pb_cocktail_seconds INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pb_spirit_seconds INT DEFAULT NULL
`;
console.log('Added pb columns to users');

// 4. Add duration columns to sessions
await sql`
  ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS total_duration_seconds INT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active_duration_seconds INT DEFAULT NULL
`;
console.log('Added total_duration_seconds and active_duration_seconds to sessions');

// 5. Add timing metadata column to drinks
await sql`
  ALTER TABLE drinks
  ADD COLUMN IF NOT EXISTS timing_method TEXT DEFAULT 'gap'
`;
await sql`
  ALTER TABLE drinks
  DROP CONSTRAINT IF EXISTS drinks_timing_method_check
`;
await sql`
  ALTER TABLE drinks
  ADD CONSTRAINT drinks_timing_method_check CHECK (timing_method IN ('gap', 'stopwatch'))
`;
await sql`
  UPDATE drinks
  SET timing_method = 'gap'
  WHERE timing_method IS NULL
`;
console.log('Added timing_method to drinks');

// 6. Backfill duration quality bounds for speed metrics
await sql`
  UPDATE drinks
  SET duration_seconds = NULL
  WHERE duration_seconds > 900
`;
await sql`
  UPDATE drinks
  SET duration_seconds = NULL
  WHERE duration_seconds < 10
`;
console.log('Backfilled invalid drink durations to NULL');

// 7. Recalculate all PB columns from cleaned durations
await sql`
  UPDATE users u SET pb_beer_seconds = (
    SELECT MIN(d.duration_seconds)
    FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id
      AND d.type = 'beer'
      AND d.duration_seconds IS NOT NULL
  )
`;
await sql`
  UPDATE users u SET pb_shot_seconds = (
    SELECT MIN(d.duration_seconds)
    FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id
      AND d.type = 'shot'
      AND d.duration_seconds IS NOT NULL
  )
`;
await sql`
  UPDATE users u SET pb_wine_seconds = (
    SELECT MIN(d.duration_seconds)
    FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id
      AND d.type = 'wine'
      AND d.duration_seconds IS NOT NULL
  )
`;
await sql`
  UPDATE users u SET pb_cocktail_seconds = (
    SELECT MIN(d.duration_seconds)
    FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id
      AND d.type = 'cocktail'
      AND d.duration_seconds IS NOT NULL
  )
`;
await sql`
  UPDATE users u SET pb_spirit_seconds = (
    SELECT MIN(d.duration_seconds)
    FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id
      AND d.type = 'spirit'
      AND d.duration_seconds IS NOT NULL
  )
`;
console.log('Recalculated PB columns after backfill');

// 8. Add indexes for PR lookup and cutoff jobs
await sql`
  CREATE INDEX IF NOT EXISTS idx_drinks_pr_lookup
  ON drinks (session_id, type, duration_seconds)
  WHERE duration_seconds IS NOT NULL
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON sessions (user_id)
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_sessions_open_start_time
  ON sessions (start_time)
  WHERE end_time IS NULL
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_drinks_session_logged_at
  ON drinks (session_id, logged_at)
`;
console.log('Added indexes for PR lookup and session cutoff');

// 9. Add is_onboarded column to users
await sql`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE
`;
console.log('Added is_onboarded to users');

// 10. Add account_deletions table
await sql`
  CREATE TABLE IF NOT EXISTS account_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;
console.log('Created account_deletions table');

// 11. Add was_auto_closed flag to sessions
await sql`
  ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS was_auto_closed BOOLEAN DEFAULT FALSE
`;
console.log('Added was_auto_closed to sessions');

// 12. Add indexes for feed and lookup performance
await sql`
  CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON follows (follower_id, following_id)
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_sessions_user_created
  ON sessions (user_id, created_at DESC)
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_drinks_session_logged
  ON drinks (session_id, logged_at)
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_drinks_duration
  ON drinks (session_id, type, duration_seconds)
  WHERE duration_seconds IS NOT NULL
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions (user_id)
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_cheers_session
  ON cheers (session_id, from_user_id)
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_session_witnesses_session
  ON session_witnesses (session_id, confirmed)
`;
console.log('Added requested indexes');

// 13. Add legal consent columns to users
await sql`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS legal_consent_version TEXT
`;
console.log('Added legal consent columns to users');

// 14. Add waitlist table for landing page email capture
await sql`
  CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;
await sql`
  CREATE INDEX IF NOT EXISTS idx_waitlist_email
  ON waitlist (email)
`;
console.log('Created waitlist table and index');

// 15. Add confidence freshness timestamp to sessions
await sql`
  ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS peak_confidence_updated_at TIMESTAMPTZ
`;
await sql`
  UPDATE sessions
  SET peak_confidence_updated_at = COALESCE(peak_confidence_updated_at, end_time, start_time, created_at)
`;
console.log('Added and backfilled peak_confidence_updated_at');

console.log('All migrations complete');
