import sql from './lib/db';

async function main() {
  try {
    const sessions = await sql`SELECT id, start_time, end_time, total_duration_seconds, active_duration_seconds, washroom_count, burp_count FROM sessions ORDER BY created_at DESC LIMIT 1`;
    console.log(sessions);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
main();
