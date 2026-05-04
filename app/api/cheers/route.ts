import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import sql from "@/lib/db";

const cheersLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const limit = cheersLimiter.check(String(user.id));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before cheering again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(limit.resetAt),
          },
        }
      );
    }

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
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/cheers failed", err);
    return NextResponse.json({ error: "Failed to update cheers" }, { status: 500 });
  }
}
