import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";
import { calculateConfidence, getStage } from "@/lib/confidence";

// POST /api/drinks — log a drink in the active session
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { session_id, type, logged_at } = body;

  if (!session_id || !type) {
    return NextResponse.json({ error: "session_id and type required" }, { status: 400 });
  }

  // Verify session belongs to user
  const [session] = await sql`
    SELECT * FROM sessions
    WHERE id = ${session_id} AND user_id = ${user.id} AND end_time IS NULL
  `;
  if (!session) return NextResponse.json({ error: "Session not found or already ended" }, { status: 404 });

  // Calculate duration since last drink of same type
  const lastSameDrink = await sql`
    SELECT logged_at FROM drinks
    WHERE session_id = ${session_id} AND type = ${type}
    ORDER BY logged_at DESC LIMIT 1
  `;

  let duration_seconds: number | null = null;
  const drinkTime = logged_at ? new Date(logged_at) : new Date();

  if (lastSameDrink.length > 0) {
    const lastTime = new Date(lastSameDrink[0].logged_at);
    duration_seconds = Math.round((drinkTime.getTime() - lastTime.getTime()) / 1000);
  }

  const [drink] = await sql`
    INSERT INTO drinks (session_id, type, logged_at, duration_seconds)
    VALUES (${session_id}, ${type}, ${drinkTime.toISOString()}, ${duration_seconds})
    RETURNING *
  `;

  // Recalculate confidence from all drinks
  const allDrinks = await sql`
    SELECT type, logged_at FROM drinks WHERE session_id = ${session_id} ORDER BY logged_at ASC
  `;
  const conf = calculateConfidence(allDrinks as any);

  await sql`
    UPDATE sessions SET
      peak_confidence_pct = GREATEST(peak_confidence_pct, ${conf.peak}),
      peak_stage = ${getStage(conf.peak)}
    WHERE id = ${session_id}
  `;

  // PR check
  const pr = await sql`
    SELECT MIN(d.duration_seconds) as best
    FROM drinks d
    JOIN sessions s ON s.id = d.session_id
    WHERE s.user_id = ${user.id} AND d.type = ${type} AND d.duration_seconds IS NOT NULL
  `;

  const is_pr =
    duration_seconds !== null &&
    pr[0]?.best !== null &&
    Number(pr[0].best) === duration_seconds;

  return NextResponse.json({ drink, confidence: conf, is_pr }, { status: 201 });
}
