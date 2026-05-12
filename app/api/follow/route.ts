import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rate-limit";
import sql from "@/lib/db";

const followLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const limit = followLimiter.check(String(user.id));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before following again." },
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
    const { target_user_id } = body;

    if (typeof target_user_id !== "string" || !UUID_RE.test(target_user_id)) {
      return NextResponse.json({ error: "target_user_id must be a valid UUID" }, { status: 400 });
    }

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
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/follow failed", err);
    return NextResponse.json({ error: "Failed to update follow" }, { status: 500 });
  }
}
