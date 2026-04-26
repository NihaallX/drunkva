import { NextResponse } from "next/server";
import webpush from "web-push";
import sql from "@/lib/db";

// Initialize VAPID
if (
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY !== "REPLACE_ME" &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_PRIVATE_KEY !== "REPLACE_ME"
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// GET /api/cron/morning-card
// Protected — only Vercel Cron (via CRON_SECRET header) or internal calls
export async function GET(req: Request) {
  const cronSecret = req.headers.get("x-vercel-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find sessions that ended 6–18 hours ago, not yet notified, with an end_time
  const sessions = await sql`
    SELECT s.id, s.user_id, s.venue_name, s.peak_stage, s.end_time, u.real_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.end_time IS NOT NULL
      AND s.end_time > NOW() - INTERVAL '18 hours'
      AND s.end_time < NOW() - INTERVAL '6 hours'
      AND s.morning_card_notified_at IS NULL
  `;

  if (sessions.length === 0) {
    return NextResponse.json({ ok: true, notified: 0, message: "No sessions to notify" });
  }

  let notified = 0;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://drunkva.app";

  for (const session of sessions) {
    // Get push subscriptions for this user
    type PushSub = { endpoint: string; p256dh: string; auth: string };
    const subs = (await sql`
      SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${session.user_id}
    `) as PushSub[];

    if (subs.length === 0) {
      // Mark as notified even if no sub — avoid re-checking every run
      await sql`UPDATE sessions SET morning_card_notified_at = NOW() WHERE id = ${session.id}`;
      continue;
    }

    const payload = JSON.stringify({
      title: "Your Drunkva card is ready 🍺",
      body: `Last night's ${session.peak_stage} session${session.venue_name ? ` at ${session.venue_name}` : ""} — tap to share.`,
      url: `${baseUrl}/morning-card?sessionId=${session.id}`,
    });

    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .catch(async (err: { statusCode?: number }) => {
            if (err.statusCode === 410) {
              await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
            }
          })
      )
    );

    // Mark as notified
    await sql`UPDATE sessions SET morning_card_notified_at = NOW() WHERE id = ${session.id}`;
    notified++;
  }

  return NextResponse.json({ ok: true, notified });
}
