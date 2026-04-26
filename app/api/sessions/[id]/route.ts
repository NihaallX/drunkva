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

// DELETE /api/sessions/[id] — delete session and recalculate PBs
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [deleted] = await sql`
    DELETE FROM sessions 
    WHERE id = ${id} AND user_id = ${user.id}
    RETURNING id
  `;

  if (!deleted) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

  // Recalculate affected PBs
  await sql`
    UPDATE users u SET pb_beer_seconds = (
      SELECT MIN(d.duration_seconds) FROM drinks d
      JOIN sessions s ON d.session_id = s.id
      WHERE s.user_id = u.id AND d.type = 'beer' AND d.duration_seconds IS NOT NULL
    ) WHERE id = ${user.id}
  `;
  await sql`
    UPDATE users u SET pb_shot_seconds = (
      SELECT MIN(d.duration_seconds) FROM drinks d
      JOIN sessions s ON d.session_id = s.id
      WHERE s.user_id = u.id AND d.type = 'shot' AND d.duration_seconds IS NOT NULL
    ) WHERE id = ${user.id}
  `;
  await sql`
    UPDATE users u SET pb_wine_seconds = (
      SELECT MIN(d.duration_seconds) FROM drinks d
      JOIN sessions s ON d.session_id = s.id
      WHERE s.user_id = u.id AND d.type = 'wine' AND d.duration_seconds IS NOT NULL
    ) WHERE id = ${user.id}
  `;
  await sql`
    UPDATE users u SET pb_cocktail_seconds = (
      SELECT MIN(d.duration_seconds) FROM drinks d
      JOIN sessions s ON d.session_id = s.id
      WHERE s.user_id = u.id AND d.type = 'cocktail' AND d.duration_seconds IS NOT NULL
    ) WHERE id = ${user.id}
  `;
  await sql`
    UPDATE users u SET pb_spirit_seconds = (
      SELECT MIN(d.duration_seconds) FROM drinks d
      JOIN sessions s ON d.session_id = s.id
      WHERE s.user_id = u.id AND d.type = 'spirit' AND d.duration_seconds IS NOT NULL
    ) WHERE id = ${user.id}
  `;

  return NextResponse.json({ success: true });
}
