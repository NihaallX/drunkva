import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";

// POST /api/witnesses — tag witnesses for a session
// Body: { session_id, user_ids: string[] }
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id, user_ids } = await req.json();
  if (!session_id || !Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json({ error: "session_id and user_ids required" }, { status: 400 });
  }
  if (user_ids.length > 5) {
    return NextResponse.json({ error: "Max 5 witnesses" }, { status: 400 });
  }

  // Verify the session belongs to this user
  const [session] = await sql`
    SELECT id, peak_stage, venue_name, user_id FROM sessions WHERE id = ${session_id}
  `;
  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "Session not found or unauthorized" }, { status: 404 });
  }

  // Insert witnesses (skip duplicates)
  for (const uid of user_ids) {
    await sql`
      INSERT INTO session_witnesses (session_id, user_id, confirmed)
      VALUES (${session_id}, ${uid}, false)
      ON CONFLICT (session_id, user_id) DO NOTHING
    `;
  }

  // Send push notifications to each tagged witness
  const taggerName = user.real_name ?? "Someone";
  const venuePart = session.venue_name ? ` at ${session.venue_name}` : "";
  const notifTitle = `${taggerName} tagged you as a witness 👁️`;
  const notifBody = `Were you there for their ${session.peak_stage} session${venuePart}? Tap to confirm.`;
  const notifUrl = `/session/${session_id}`;

  const internalSecret = process.env.CLERK_SECRET_KEY!;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  await Promise.allSettled(
    user_ids.map((uid) =>
      fetch(`${baseUrl}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": internalSecret,
        },
        body: JSON.stringify({ user_id: uid, title: notifTitle, body: notifBody, url: notifUrl }),
      })
    )
  );

  return NextResponse.json({ ok: true, tagged: user_ids.length });
}

// PATCH /api/witnesses — confirm or decline witness tag
// Body: { session_id, confirmed: boolean }
export async function PATCH(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id, confirmed } = await req.json();
  if (!session_id || typeof confirmed !== "boolean") {
    return NextResponse.json({ error: "session_id and confirmed required" }, { status: 400 });
  }

  const [witness] = await sql`
    UPDATE session_witnesses
    SET confirmed = ${confirmed}
    WHERE session_id = ${session_id} AND user_id = ${user.id}
    RETURNING *
  `;

  if (!witness) {
    return NextResponse.json({ error: "Witness record not found" }, { status: 404 });
  }

  // Recalculate is_verified on the session — if >= 2 confirmed witnesses
  await sql`
    UPDATE sessions SET is_verified = (
      SELECT COUNT(*) >= 2 FROM session_witnesses
      WHERE session_id = ${session_id} AND confirmed = true
    )
    WHERE id = ${session_id}
  `;

  return NextResponse.json({ ok: true, confirmed });
}
