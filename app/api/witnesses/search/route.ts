import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";

const searchLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GET /api/witnesses/search?q=query — search for users to tag as witnesses
// Returns people the current user follows or who follow them
export async function GET(req: Request) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rate = searchLimiter.check(user.id);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const sessionId = searchParams.get("sessionId");
    if (sessionId && !UUID_REGEX.test(sessionId)) {
      return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
    }

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
