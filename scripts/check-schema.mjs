import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

// Read .env.local manually
const env = readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL="([^"]+)"/)?.[1];
const sql = neon(dbUrl);

const witnesses = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'session_witnesses' ORDER BY ordinal_position`;
console.log('WITNESSES:', JSON.stringify(witnesses, null, 2));

const sessions = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions' ORDER BY ordinal_position`;
console.log('SESSIONS:', JSON.stringify(sessions, null, 2));

const pushSubs = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'push_subscriptions' ORDER BY ordinal_position`;
console.log('PUSH_SUBS:', JSON.stringify(pushSubs, null, 2));
