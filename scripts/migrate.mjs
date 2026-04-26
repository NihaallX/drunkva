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
console.log('✓ Added morning_card_notified_at to sessions');

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
console.log('✓ Added unique constraint to session_witnesses');

console.log('All migrations complete');
