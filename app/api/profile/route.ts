import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";

// GET /api/profile — own profile + stats, or another user's profile via ?userId=<db_id>
export async function GET(req: Request) {
  const currentUser = await getOrCreateUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  // Resolve which user's profile to show
  let user;
  if (targetUserId && targetUserId !== currentUser.id) {
    const [found] = await sql`SELECT * FROM users WHERE id = ${targetUserId}`;
    user = found ?? null;
  } else {
    user = currentUser;
  }

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const [stats] = await sql`
    SELECT
      COUNT(DISTINCT s.id)::int as total_sessions,
      COALESCE(MAX(s.peak_confidence_pct), 10) as all_time_peak,
      (SELECT d.type FROM drinks d JOIN sessions ss ON ss.id = d.session_id
       WHERE ss.user_id = ${user.id}
       GROUP BY d.type ORDER BY COUNT(*) DESC LIMIT 1) as favourite_drink,
      (SELECT MIN(d.duration_seconds) FROM drinks d
       JOIN sessions ss ON ss.id = d.session_id
       WHERE ss.user_id = ${user.id} AND d.type = 'beer' AND d.duration_seconds IS NOT NULL
      ) as fastest_beer_seconds
    FROM sessions s WHERE s.user_id = ${user.id}
  `;

  const [follows_row] = await sql`SELECT COUNT(*)::int as c FROM follows WHERE follower_id = ${user.id}`;
  const [followers_row] = await sql`SELECT COUNT(*)::int as c FROM follows WHERE following_id = ${user.id}`;

  let is_following = false;
  if (currentUser.id !== user.id) {
    const [f] = await sql`
      SELECT id FROM follows WHERE follower_id = ${currentUser.id} AND following_id = ${user.id}
    `;
    is_following = !!f;
  }

  return NextResponse.json({
    user,
    stats: {
      total_sessions: stats?.total_sessions ?? 0,
      all_time_peak: Number(stats?.all_time_peak ?? 10),
      favourite_drink: stats?.favourite_drink ?? null,
      fastest_beer_seconds: stats?.fastest_beer_seconds ?? null,
    },
    follows: follows_row?.c ?? 0,
    followers: followers_row?.c ?? 0,
    is_following,
  });
}

// PATCH /api/profile — update display name, alias (used from onboarding)
export async function PATCH(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { real_name, alias } = body;
  if (!real_name?.trim()) {
    return NextResponse.json({ error: "real_name is required" }, { status: 400 });
  }

  const [updated] = await sql`
    UPDATE users SET
      real_name = ${real_name.trim()},
      alias = ${alias?.trim() ?? null},
      is_onboarded = TRUE
    WHERE id = ${user.id}
    RETURNING *
  `;

  return NextResponse.json({ user: updated });
}
