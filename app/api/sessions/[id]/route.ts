import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";

// GET /api/sessions/[id] — full session + drinks (public — no auth required for viewing)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [session] = await sql`
    SELECT s.*, u.real_name, u.alias, u.avatar_url
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${id}
  `;
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const drinks = await sql`
    SELECT * FROM drinks WHERE session_id = ${id} ORDER BY logged_at ASC
  `;

  const witnesses = await sql`
    SELECT sw.*, u.real_name, u.alias, u.avatar_url
    FROM session_witnesses sw
    JOIN users u ON u.id = sw.user_id
    WHERE sw.session_id = ${id}
  `;

  const cheersCount = await sql`
    SELECT COUNT(*) as count FROM cheers WHERE session_id = ${id}
  `;

  return NextResponse.json({
    session,
    drinks,
    witnesses,
    cheers_count: Number(cheersCount[0]?.count ?? 0),
  });
}

// PATCH /api/sessions/[id] — update session (end, title, extras)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { end_time, session_title, venue_name, washroom_count, burp_count, chakna_level } = body;

  const [session] = await sql`
    UPDATE sessions SET
      end_time = COALESCE(${end_time ?? null}, end_time),
      session_title = COALESCE(${session_title ?? null}, session_title),
      venue_name = COALESCE(${venue_name ?? null}, venue_name),
      washroom_count = COALESCE(${washroom_count ?? null}, washroom_count),
      burp_count = COALESCE(${burp_count ?? null}, burp_count),
      chakna_level = COALESCE(${chakna_level ?? null}, chakna_level)
    WHERE id = ${id} AND user_id = ${user.id}
    RETURNING *
  `;

  if (!session) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

  return NextResponse.json({ session });
}
