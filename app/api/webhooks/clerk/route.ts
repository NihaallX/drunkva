import { NextResponse } from "next/server";
import { Webhook } from "svix";
import sql from "@/lib/db";

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set — webhook endpoint is disabled");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  const wh = new Webhook(webhookSecret);
  let event: { type: string; data: { id: string; image_url?: string } };

  try {
    event = wh.verify(payload, headers) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const { id, image_url } = event.data;
    // Insert placeholder user — real_name/alias set during onboarding
    await sql`
      INSERT INTO users (clerk_id, real_name, avatar_url)
      VALUES (${id}, 'Drunkva User', ${image_url ?? null})
      ON CONFLICT (clerk_id) DO NOTHING
    `;
  }

  if (event.type === "user.updated") {
    const { id, image_url } = event.data;
    await sql`
      UPDATE users SET avatar_url = ${image_url ?? null} WHERE clerk_id = ${id}
    `;
  }

  return NextResponse.json({ ok: true });
}
