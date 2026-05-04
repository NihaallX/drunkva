import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import sql from "@/lib/db";

// GET /api/witnesses/search?q=query — search for users to tag as witnesses
// Returns people the current user follows or who follow them
export async function GET(req: Request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const results = await sql`
      SELECT DISTINCT u.id, u.real_name, u.alias, u.avatar_url
      FROM users u
      WHERE u.id != ${user.id}
        AND (u.id IN (
          SELECT following_id FROM follows WHERE follower_id = ${user.id}
          UNION
          SELECT follower_id FROM follows WHERE following_id = ${user.id}
        ))
        AND (
          ${q} = '' OR
          u.real_name ILIKE ${"%" + q + "%"} OR
          u.alias ILIKE ${"%" + q + "%"}
        )
      LIMIT 20
    `;

    return NextResponse.json({ users: results });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/witnesses/search failed", err);
    return NextResponse.json({ error: "Failed to search witnesses" }, { status: 500 });
  }
}
