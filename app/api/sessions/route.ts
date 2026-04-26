import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";

// GET /api/sessions — list user's sessions
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ sessions: [] });

  const sessions = await sql`
    SELECT s.*,
      (SELECT COUNT(*) FROM drinks d WHERE d.session_id = s.id)::int as drink_count
    FROM sessions s
    WHERE s.user_id = ${user.id}
    ORDER BY s.created_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ sessions });
}

// POST /api/sessions — start a new session
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { venue_name, location_lat, location_lng } = body;

  const [session] = await sql`
    INSERT INTO sessions (user_id, venue_name, location_lat, location_lng)
    VALUES (${user.id}, ${venue_name ?? null}, ${location_lat ?? null}, ${location_lng ?? null})
    RETURNING *
  `;

  return NextResponse.json({ session }, { status: 201 });
}
