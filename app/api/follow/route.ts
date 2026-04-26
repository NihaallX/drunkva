import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { target_user_id } = body;

  if (user.id === target_user_id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const existing = await sql`
    SELECT id FROM follows WHERE follower_id = ${user.id} AND following_id = ${target_user_id}
  `;

  if (existing.length > 0) {
    await sql`DELETE FROM follows WHERE follower_id = ${user.id} AND following_id = ${target_user_id}`;
    return NextResponse.json({ following: false });
  } else {
    await sql`
      INSERT INTO follows (follower_id, following_id) VALUES (${user.id}, ${target_user_id})
      ON CONFLICT DO NOTHING
    `;
    return NextResponse.json({ following: true });
  }
}
