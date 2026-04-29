import { NextResponse } from "next/server";
import webpush from "web-push";
import sql from "@/lib/db";
import {
  calculateActiveDurationSeconds,
  calculateTotalDurationSeconds,
  type SessionDrinkTime,
} from "@/lib/session-duration";

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
// Protected - only Vercel Cron (via CRON_SECRET header) or internal calls
export async function GET(req: Request) {
  const cronSecret = req.headers.get("x-vercel-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://drunkva.app";
  let notified = 0;

  type NotificationSession = {
    id: string;
    user_id: string;
    venue_name: string | null;
    peak_stage: string | null;
  };

  type PushSub = {
    endpoint: string;
    p256dh: string;
    auth: string;
  };

  const notifySession = async (session: NotificationSession) => {
    const subs = (await sql`
      SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${session.user_id}
    `) as PushSub[];

    if (subs.length === 0) {
      await sql`UPDATE sessions SET morning_card_notified_at = NOW() WHERE id = ${session.id}`;
      return;
    }

    const payload = JSON.stringify({
      title: "Your Drunkva card is ready",
      body: `Last night's ${session.peak_stage ?? "peak"} session${session.venue_name ? ` at ${session.venue_name}` : ""}. Tap to share.`,
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

    await sql`UPDATE sessions SET morning_card_notified_at = NOW() WHERE id = ${session.id}`;
    notified++;
  };

  // Level 3: stale open sessions with no drinks older than 48h are discarded.
  const deletedStale = await sql`
    DELETE FROM sessions s
    WHERE s.end_time IS NULL
      AND s.start_time < NOW() - INTERVAL '48 hours'
      AND NOT EXISTS (
        SELECT 1 FROM drinks d WHERE d.session_id = s.id
      )
    RETURNING s.id
  `;

  // Level 2: hard cutoff for any still-open session beyond 12h from start (silent close).
  const hardCutoffSessions = await sql`
    SELECT s.id, s.start_time
    FROM sessions s
    WHERE s.end_time IS NULL
      AND s.start_time < NOW() - INTERVAL '12 hours'
  `;

  let hardClosed = 0;
  for (const session of hardCutoffSessions) {
    const endTime = new Date(new Date(session.start_time).getTime() + 12 * 60 * 60 * 1000).toISOString();
    const drinks = (await sql`
      SELECT logged_at
      FROM drinks
      WHERE session_id = ${session.id}
      ORDER BY logged_at ASC
    `) as SessionDrinkTime[];

    const totalDurationSeconds = calculateTotalDurationSeconds(session.start_time, endTime);
    const activeDurationSeconds = calculateActiveDurationSeconds(drinks, endTime);

    await sql`
      UPDATE sessions
      SET end_time = ${endTime},
          total_duration_seconds = ${totalDurationSeconds},
          active_duration_seconds = ${activeDurationSeconds}
      WHERE id = ${session.id}
    `;

    hardClosed++;
  }

  // Level 1: no drink for 4h -> auto-end at last_drink + 4h and notify now.
  const softCutoffSessions = await sql`
    SELECT
      s.id,
      s.user_id,
      s.start_time,
      s.venue_name,
      s.peak_stage,
      MAX(d.logged_at) AS last_drink_at
    FROM sessions s
    JOIN drinks d ON d.session_id = s.id
    WHERE s.end_time IS NULL
      AND s.start_time >= NOW() - INTERVAL '12 hours'
    GROUP BY s.id, s.user_id, s.start_time, s.venue_name, s.peak_stage
    HAVING MAX(d.logged_at) < NOW() - INTERVAL '4 hours'
  `;

  let softClosed = 0;
  for (const session of softCutoffSessions) {
    if (!session.last_drink_at) continue;

    const endTime = new Date(new Date(session.last_drink_at).getTime() + 4 * 60 * 60 * 1000).toISOString();
    const drinks = (await sql`
      SELECT logged_at
      FROM drinks
      WHERE session_id = ${session.id}
      ORDER BY logged_at ASC
    `) as SessionDrinkTime[];

    const totalDurationSeconds = calculateTotalDurationSeconds(session.start_time, endTime);
    const activeDurationSeconds = calculateActiveDurationSeconds(drinks, endTime);

    await sql`
      UPDATE sessions
      SET end_time = ${endTime},
          total_duration_seconds = ${totalDurationSeconds},
          active_duration_seconds = ${activeDurationSeconds}
      WHERE id = ${session.id}
    `;

    await notifySession({
      id: session.id,
      user_id: session.user_id,
      venue_name: session.venue_name,
      peak_stage: session.peak_stage,
    });

    softClosed++;
  }

  // Existing morning-card reminder window for already-ended sessions.
  const sessionsToNotify = await sql`
    SELECT s.id, s.user_id, s.venue_name, s.peak_stage
    FROM sessions s
    WHERE s.end_time IS NOT NULL
      AND s.end_time > NOW() - INTERVAL '18 hours'
      AND s.end_time < NOW() - INTERVAL '6 hours'
      AND s.morning_card_notified_at IS NULL
  `;

  for (const session of sessionsToNotify) {
    await notifySession(session as NotificationSession);
  }

  return NextResponse.json({
    ok: true,
    notified,
    auto_closed_soft: softClosed,
    auto_closed_hard: hardClosed,
    stale_deleted: deletedStale.length,
  });
}

