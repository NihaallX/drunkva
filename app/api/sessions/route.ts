import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import sql from "@/lib/db";
import { getDecayedPeakConfidence } from "@/lib/confidence";

// GET /api/sessions — list user's sessions
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(50, limitParam)) : 50;

    const sessions = await sql`
      SELECT s.*,
        COALESCE(
          s.total_duration_seconds,
          EXTRACT(EPOCH FROM COALESCE(s.end_time, NOW()) - s.start_time)::int
        )::int as duration_seconds,
        (SELECT COUNT(*) FROM drinks d WHERE d.session_id = s.id)::int as drink_count
      FROM sessions s
      WHERE s.user_id = ${user.id}
      ORDER BY s.created_at DESC
      LIMIT ${limit}
    `;

    const sessionsWithDecayedPeak = sessions.map((session) => {
      const decayedPeak = getDecayedPeakConfidence(
        Number(session.peak_confidence_pct ?? 10),
        session.peak_confidence_updated_at ?? session.end_time ?? session.start_time ?? session.created_at
      );

      return {
        ...session,
        peak_confidence_pct: decayedPeak.confidence,
        peak_stage: decayedPeak.stage,
      };
    });

    return NextResponse.json({ sessions: sessionsWithDecayedPeak });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/sessions failed", err);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}

// POST /api/sessions — start a new session
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const body = await req.json().catch(() => ({}));
    const { venue_name, location_lat, location_lng } = body;

    if (typeof venue_name === "string" && venue_name.length > 100) {
      return NextResponse.json({ error: "Venue name too long" }, { status: 400 });
    }

    const [session] = await sql`
      INSERT INTO sessions (user_id, venue_name, location_lat, location_lng)
      VALUES (${user.id}, ${venue_name ?? null}, ${location_lat ?? null}, ${location_lng ?? null})
      RETURNING *
    `;

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/sessions failed", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
