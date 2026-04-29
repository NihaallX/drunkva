import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ feed: [], has_more: false });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "0");
  const limit = 20;
  const offset = page * limit;

  const feed = await sql`
    SELECT
      s.*,
      u.real_name, u.alias, u.avatar_url, u.id as author_id,
      (SELECT COUNT(*)::int FROM drinks d WHERE d.session_id = s.id) as drink_count,
      (SELECT COUNT(*)::int FROM cheers c WHERE c.session_id = s.id) as cheers_count,
      (SELECT EXISTS(
        SELECT 1 FROM cheers c WHERE c.session_id = s.id AND c.from_user_id = ${user.id}
      )) as user_has_cheered,
      (SELECT MIN(d.duration_seconds) FROM drinks d
       WHERE d.session_id = s.id
         AND d.type = 'beer'
         AND d.duration_seconds IS NOT NULL
         AND d.duration_seconds >= 10
         AND d.duration_seconds <= 900
      ) as fastest_beer_seconds,
      (SELECT COUNT(*)::int FROM session_witnesses sw
       WHERE sw.session_id = s.id AND sw.confirmed = true
      ) as confirmed_witness_count
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = ${user.id}
    )
    AND s.end_time IS NOT NULL
    ORDER BY s.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return NextResponse.json({ feed, has_more: feed.length === limit });
}
