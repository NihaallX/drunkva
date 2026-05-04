import { NextResponse } from "next/server";
import webpush from "web-push";
import sql from "@/lib/db";

// Only initialize VAPID when all keys are present (prevents build-time crash)
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

// POST /api/push/send — internal: send push to a user_id
// Protected: only callable server-side (check secret header)
export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { user_id, title, body, url } = await req.json();

  type PushSub = { endpoint: string; p256dh: string; auth: string };
  const subscriptions = (await sql`
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${user_id}
  `) as PushSub[];

  const payload = JSON.stringify({ title, body, url: url ?? "/" });
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      ).catch(async (err: { statusCode?: number }) => {
        // Remove expired subscriptions
        if (err.statusCode === 410) {
          await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
        }
      })
    )
  );

  return NextResponse.json({ sent: results.length });
}
