import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// POST /api/push/subscribe — store browser push subscription
export async function POST(req: Request) {
  let user;
  try {
    user = await requireAuth();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint, p256dh, auth: authKey } = await req.json();

  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (${user.id}, ${endpoint}, ${p256dh}, ${authKey})
    ON CONFLICT (endpoint) DO UPDATE SET
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_id = EXCLUDED.user_id
  `;

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe — remove subscription on permission revoke
export async function DELETE(req: Request) {
  try {
    await requireAuth();
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await req.json();
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;

  return NextResponse.json({ ok: true });
}
