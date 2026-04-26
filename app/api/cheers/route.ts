import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { session_id } = body;

  const existing = await sql`
    SELECT id FROM cheers WHERE session_id = ${session_id} AND from_user_id = ${user.id}
  `;

  if (existing.length > 0) {
    await sql`DELETE FROM cheers WHERE session_id = ${session_id} AND from_user_id = ${user.id}`;
    const [count] = await sql`SELECT COUNT(*)::int as c FROM cheers WHERE session_id = ${session_id}`;
    return NextResponse.json({ cheered: false, count: count.c });
  } else {
    await sql`
      INSERT INTO cheers (session_id, from_user_id) VALUES (${session_id}, ${user.id})
      ON CONFLICT DO NOTHING
    `;
    const [count] = await sql`SELECT COUNT(*)::int as c FROM cheers WHERE session_id = ${session_id}`;
    return NextResponse.json({ cheered: true, count: count.c });
  }
}
