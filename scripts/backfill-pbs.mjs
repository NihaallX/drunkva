import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL="([^"]+)"/)?.[1];
const sql = neon(dbUrl);

console.log('Starting speed backfill...');

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
console.log('Normalized invalid duration_seconds values');

await sql`
  UPDATE users u SET pb_beer_seconds = (
    SELECT MIN(d.duration_seconds) FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id AND d.type = 'beer' AND d.duration_seconds IS NOT NULL
  )
`;
console.log('Backfilled PBs for beer');

await sql`
  UPDATE users u SET pb_shot_seconds = (
    SELECT MIN(d.duration_seconds) FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id AND d.type = 'shot' AND d.duration_seconds IS NOT NULL
  )
`;
console.log('Backfilled PBs for shot');

await sql`
  UPDATE users u SET pb_wine_seconds = (
    SELECT MIN(d.duration_seconds) FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id AND d.type = 'wine' AND d.duration_seconds IS NOT NULL
  )
`;
console.log('Backfilled PBs for wine');

await sql`
  UPDATE users u SET pb_cocktail_seconds = (
    SELECT MIN(d.duration_seconds) FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id AND d.type = 'cocktail' AND d.duration_seconds IS NOT NULL
  )
`;
console.log('Backfilled PBs for cocktail');

await sql`
  UPDATE users u SET pb_spirit_seconds = (
    SELECT MIN(d.duration_seconds) FROM drinks d
    JOIN sessions s ON d.session_id = s.id
    WHERE s.user_id = u.id AND d.type = 'spirit' AND d.duration_seconds IS NOT NULL
  )
`;
console.log('Backfilled PBs for spirit');

console.log('Backfill complete');
