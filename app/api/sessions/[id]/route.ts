import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";
import {
  calculateActiveDurationSeconds,
  calculateTotalDurationSeconds,
  type SessionDrinkTime,
} from "@/lib/session-duration";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/sessions/[id] - full session + drinks (public)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  try {
    const [sessionRow] = await sql`
      SELECT * FROM sessions
      WHERE id = ${id}
    `;
    if (!sessionRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [user] = await sql`
      SELECT real_name, alias, avatar_url
      FROM users
      WHERE id = ${sessionRow.user_id}
    `;

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
      session: {
        ...sessionRow,
        real_name: user?.real_name ?? null,
        alias: user?.alias ?? null,
        avatar_url: user?.avatar_url ?? null,
      },
      drinks,
      witnesses,
      cheers_count: Number(cheersCount[0]?.count ?? 0),
    });
  } catch (error) {
    console.error("GET /api/sessions/[id] failed", { id, error });
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}

// PATCH /api/sessions/[id] - update session (end, title, extras)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { end_time, session_title, venue_name, washroom_count, burp_count, chakna_level } = body;

  const [existing] = await sql`
    SELECT id, start_time
    FROM sessions
    WHERE id = ${id} AND user_id = ${user.id}
  `;
  if (!existing) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

  let resolvedEndTime: string | null = null;
  let totalDurationSeconds: number | null = null;
  let activeDurationSeconds: number | null = null;

  if (typeof end_time === "string" && end_time.trim().length > 0) {
    const endMs = new Date(end_time).getTime();
    if (!Number.isFinite(endMs)) {
      return NextResponse.json({ error: "Invalid end_time" }, { status: 400 });
    }

    resolvedEndTime = new Date(endMs).toISOString();
    const drinks = (await sql`
      SELECT logged_at
      FROM drinks
      WHERE session_id = ${id}
      ORDER BY logged_at ASC
    `) as SessionDrinkTime[];

    totalDurationSeconds = calculateTotalDurationSeconds(existing.start_time, resolvedEndTime);
    activeDurationSeconds = calculateActiveDurationSeconds(drinks, resolvedEndTime);
  }

  const [session] = await sql`
    UPDATE sessions SET
      end_time = COALESCE(${resolvedEndTime}::timestamp, end_time),
      session_title = COALESCE(${session_title ?? null}::text, session_title),
      venue_name = COALESCE(${venue_name ?? null}::text, venue_name),
      washroom_count = COALESCE(${washroom_count ?? null}::integer, washroom_count),
      burp_count = COALESCE(${burp_count ?? null}::integer, burp_count),
      chakna_level = COALESCE(${chakna_level ?? null}::text, chakna_level),
      total_duration_seconds = CASE
        WHEN ${resolvedEndTime}::text IS NOT NULL THEN ${totalDurationSeconds}::integer
        ELSE total_duration_seconds
      END,
      active_duration_seconds = CASE
        WHEN ${resolvedEndTime}::text IS NOT NULL THEN ${activeDurationSeconds}::integer
        ELSE active_duration_seconds
      END
    WHERE id = ${id} AND user_id = ${user.id}
    RETURNING *
  `;

  if (!session) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

  return NextResponse.json({ session });
}

// DELETE /api/sessions/[id] - delete session and recalculate PBs
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
