import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import sql from "@/lib/db";

// POST /api/push/subscribe — store browser push subscription
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await sql`SELECT id FROM users WHERE clerk_id = ${userId}`;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json();
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;

  return NextResponse.json({ ok: true });
}
