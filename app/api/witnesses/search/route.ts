import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";

// GET /api/witnesses/search?q=query — search for users to tag as witnesses
// Returns people the current user follows or who follow them
export async function GET(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
}
