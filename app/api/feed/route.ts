import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import sql from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") ?? "0");
    const limit = 20;
    const offset = page * limit;

    const feed = await sql`
      SELECT
        s.*,
        u.real_name, u.alias, u.avatar_url, u.id as author_id,
        COUNT(DISTINCT d.id)::int as drink_count,
        COUNT(DISTINCT c.id)::int as cheers_count,
        (COUNT(DISTINCT CASE WHEN c.from_user_id = ${user.id} THEN c.id END) > 0) as user_has_cheered,
        MIN(CASE
          WHEN d.type = 'beer'
            AND d.duration_seconds IS NOT NULL
            AND d.duration_seconds >= 10
            AND d.duration_seconds <= 900
          THEN d.duration_seconds
        END) as fastest_beer_seconds,
        COUNT(DISTINCT CASE WHEN sw.confirmed = true THEN sw.id END)::int as confirmed_witness_count
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN drinks d ON d.session_id = s.id
      LEFT JOIN cheers c ON c.session_id = s.id
      LEFT JOIN session_witnesses sw ON sw.session_id = s.id
      WHERE s.user_id IN (
        SELECT following_id FROM follows WHERE follower_id = ${user.id}
      )
      AND s.end_time IS NOT NULL
      GROUP BY s.id, u.id
      ORDER BY s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return NextResponse.json({ feed, has_more: feed.length === limit });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/feed failed", err);
    return NextResponse.json({ error: "Failed to load feed" }, { status: 500 });
  }
}
