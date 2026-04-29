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

// 5. Add indexes for PR lookup and cutoff jobs
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

console.log('All migrations complete');

