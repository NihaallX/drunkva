import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import sql from "@/lib/db";

function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

// GET /api/profile — own profile + stats, or another user's profile via ?userId=<db_id>
export async function GET(req: Request) {
  try {
    const currentUser = await requireAuth();

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
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/profile failed", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

// PATCH /api/profile — update display name, alias (used from onboarding)
export async function PATCH(req: Request) {
  try {
    const user = await requireAuth();

    const body = await req.json().catch(() => ({}));
    const { real_name, alias } = body;
    const trimmedName = typeof real_name === "string" ? real_name.trim() : "";
    const trimmedAlias = typeof alias === "string" ? alias.trim() : "";

    if (!trimmedName) {
      return NextResponse.json({ error: "real_name is required" }, { status: 400 });
    }
    if (trimmedName.length > 60) {
      return NextResponse.json({ error: "Name too long" }, { status: 400 });
    }
    if (trimmedAlias && trimmedAlias.length > 30) {
      return NextResponse.json({ error: "Alias too long" }, { status: 400 });
    }

    const [updated] = await sql`
      UPDATE users SET
        real_name = ${trimmedName},
        alias = ${trimmedAlias || null},
        is_onboarded = TRUE
      WHERE id = ${user.id}
      RETURNING *
    `;

    return NextResponse.json({ user: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("PATCH /api/profile failed", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();

    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    await sql`BEGIN`;
    try {
      // 1. Delete follows
      await sql`DELETE FROM follows WHERE follower_id = ${user.id} OR following_id = ${user.id}`;

      // 2. Delete cheers
      await sql`DELETE FROM cheers WHERE from_user_id = ${user.id} OR session_id IN (SELECT id FROM sessions WHERE user_id = ${user.id})`;

      // 3. Delete witnesses
      await sql`DELETE FROM session_witnesses WHERE user_id = ${user.id} OR session_id IN (SELECT id FROM sessions WHERE user_id = ${user.id})`;

      // 4. Delete drinks
      await sql`DELETE FROM drinks WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ${user.id})`;

      // 5. Delete sessions
      await sql`DELETE FROM sessions WHERE user_id = ${user.id}`;

      // 6. Delete user
      await sql`DELETE FROM users WHERE id = ${user.id}`;

      // 7. Store survey reason decoupled
      if (reason) {
        await sql`INSERT INTO account_deletions (reason) VALUES (${reason})`;
      }

      await sql`COMMIT`;
      return NextResponse.json({ success: true });
    } catch (txErr) {
      try {
        await sql`ROLLBACK`;
      } catch (rollbackErr) {
        console.error("DELETE /api/profile rollback failed", rollbackErr);
      }
      console.error("DELETE /api/profile transaction failed", txErr);
      return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("DELETE /api/profile failed", err);
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
