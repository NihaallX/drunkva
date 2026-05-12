import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import sql from "@/lib/db";
import { calculateConfidence } from "@/lib/confidence";
import type { DrinkLog } from "@/lib/confidence";
import { MAX_SPEED_SECONDS, MIN_REALISTIC_SECONDS, normalizeDuration } from "@/lib/drink-speed";
import { drinksLimiter } from "@/lib/rate-limit";
import { logError } from "@/lib/logger";

const VALID_DRINK_TYPES = ["beer", "shot", "wine", "cocktail", "spirit"] as const;
type DrinkType = typeof VALID_DRINK_TYPES[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// POST /api/drinks - log a drink in the active session
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    // Rate limit: max 60 drink logs per user per minute
    const limit = drinksLimiter.check(String(user.id));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Slow down." },
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

    // Check if this is a round batch request
    if (body.round === true) {
      return handleRoundBatch(user.id, body);
    }

    // Otherwise, handle single drink log (existing flow)
    const { session_id, type, logged_at, manual_duration_seconds } = body;

    if (!session_id || !type) {
      return NextResponse.json({ error: "session_id and type required" }, { status: 400 });
    }

    // Validate session_id format to prevent unexpected values reaching the DB
    if (typeof session_id !== "string" || !UUID_RE.test(session_id)) {
      return NextResponse.json({ error: "Invalid session_id" }, { status: 400 });
    }

    // Strict enum check — reject unknown drink types before they reach the DB
    if (typeof type !== "string" || !VALID_DRINK_TYPES.includes(type as DrinkType)) {
      return NextResponse.json(
        { error: `Invalid drink type. Must be one of: ${VALID_DRINK_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const drinkType = type as DrinkType;

    // Sanitise manual_duration_seconds — must be a finite positive number if present
    if (manual_duration_seconds !== undefined && manual_duration_seconds !== null) {
      if (
        typeof manual_duration_seconds !== "number" ||
        !Number.isFinite(manual_duration_seconds) ||
        manual_duration_seconds < 0
      ) {
        return NextResponse.json({ error: "Invalid manual_duration_seconds" }, { status: 400 });
      }
    }

    // Validate logged_at is a parseable ISO timestamp if provided
    if (logged_at !== undefined && logged_at !== null) {
      if (typeof logged_at !== "string" || !Number.isFinite(new Date(logged_at).getTime())) {
        return NextResponse.json({ error: "Invalid logged_at timestamp" }, { status: 400 });
      }
    }

    // Verify session belongs to user and is still open
    const [session] = await sql`
      SELECT * FROM sessions
      WHERE id = ${session_id} AND user_id = ${user.id} AND end_time IS NULL
    `;
    if (!session) return NextResponse.json({ error: "Session not found or already ended" }, { status: 404 });

    let duration_seconds: number | null = null;
    let timing_method: "gap" | "stopwatch" = "gap";
    const drinkTime = logged_at ? new Date(logged_at) : new Date();
    const drinkIso = drinkTime.toISOString();

    if (
      typeof manual_duration_seconds === "number" &&
      manual_duration_seconds >= MIN_REALISTIC_SECONDS &&
      manual_duration_seconds <= MAX_SPEED_SECONDS
    ) {
      // Stopwatch mode gives authoritative speed measurement
      duration_seconds = Math.floor(manual_duration_seconds);
      timing_method = "stopwatch";
    } else {
      // Estimated speed is time since previous drink of any type
      const previousDrink = await sql`
        SELECT logged_at
        FROM drinks
        WHERE session_id = ${session_id}
          AND logged_at < ${drinkIso}
        ORDER BY logged_at DESC
        LIMIT 1
      `;

      if (previousDrink.length > 0) {
        const lastTime = new Date(previousDrink[0].logged_at);
        const gap = Math.floor((drinkTime.getTime() - lastTime.getTime()) / 1000);
        duration_seconds = normalizeDuration(gap);
      }
    }

    const [drink] = await sql`
      INSERT INTO drinks (session_id, type, logged_at, duration_seconds, timing_method)
      VALUES (${session_id}, ${drinkType}, ${drinkIso}, ${duration_seconds}, ${timing_method})
      RETURNING *
    `;

    // Recalculate confidence from all drinks
    const allDrinks = await sql`
      SELECT type, logged_at FROM drinks WHERE session_id = ${session_id} ORDER BY logged_at ASC
    `;
    const conf = calculateConfidence(allDrinks as DrinkLog[]);

    await sql`
      UPDATE sessions SET
        peak_confidence_pct = GREATEST(peak_confidence_pct, ${conf.peak}),
        peak_stage = CASE
          WHEN ${conf.peak} > peak_confidence_pct THEN ${conf.peakStage}
          ELSE peak_stage
        END,
        peak_confidence_updated_at = CASE
          WHEN ${conf.peak} > peak_confidence_pct THEN ${drinkIso}
          ELSE COALESCE(peak_confidence_updated_at, ${drinkIso})
        END
      WHERE id = ${session_id}
    `;

    // PR check using cached user PBs
    let is_pr = false;
    if (duration_seconds !== null) {
      const [userRow] = await sql`SELECT * FROM users WHERE id = ${user.id}`;

      const pbCol = `pb_${drinkType}_seconds`;
      const currentPB = userRow?.[pbCol];

      is_pr = currentPB === null || duration_seconds < currentPB;

      if (is_pr) {
        if (drinkType === "beer") await sql`UPDATE users SET pb_beer_seconds = ${duration_seconds} WHERE id = ${user.id}`;
        else if (drinkType === "shot") await sql`UPDATE users SET pb_shot_seconds = ${duration_seconds} WHERE id = ${user.id}`;
        else if (drinkType === "wine") await sql`UPDATE users SET pb_wine_seconds = ${duration_seconds} WHERE id = ${user.id}`;
        else if (drinkType === "cocktail") await sql`UPDATE users SET pb_cocktail_seconds = ${duration_seconds} WHERE id = ${user.id}`;
        else if (drinkType === "spirit") await sql`UPDATE users SET pb_spirit_seconds = ${duration_seconds} WHERE id = ${user.id}`;
      }
    }

    return NextResponse.json({ drink, confidence: conf, is_pr }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    logError({ context: "POST /api/drinks", message: "Failed to log drink", data: err });
    return NextResponse.json({ error: "Failed to log drink" }, { status: 500 });
  }
}

// Handle round-based batch drink logging
async function handleRoundBatch(userId: string, body: any) {
  try {
    const { round_id, drinks: drinksList, session_ids } = body;

    // Validate round_id UUID
    if (!round_id || typeof round_id !== "string" || !UUID_RE.test(round_id)) {
      return NextResponse.json({ error: "Invalid or missing round_id" }, { status: 400 });
    }

    // Validate drinks array
    if (!Array.isArray(drinksList) || drinksList.length === 0) {
      return NextResponse.json({ error: "drinks array required and must not be empty" }, { status: 400 });
    }

    // Validate session_ids array
    if (!Array.isArray(session_ids) || session_ids.length === 0) {
      return NextResponse.json({ error: "session_ids array required and must not be empty" }, { status: 400 });
    }

    // For now, solo flow only: require exactly one session and it must belong to caller
    if (session_ids.length !== 1) {
      return NextResponse.json({ error: "Group rounds not yet supported; provide exactly one session_id" }, { status: 400 });
    }

    const sessionId = session_ids[0];
    if (typeof sessionId !== "string" || !UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: "Invalid session_id format" }, { status: 400 });
    }

    // Validate all drinks in the array
    for (const drink of drinksList) {
      if (!drink.type || typeof drink.type !== "string") {
        return NextResponse.json({ error: "Each drink must have a type" }, { status: 400 });
      }
      if (!VALID_DRINK_TYPES.includes(drink.type as DrinkType)) {
        return NextResponse.json(
          { error: `Invalid drink type: ${drink.type}. Must be one of: ${VALID_DRINK_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
      if (drink.manual_duration_seconds !== undefined && drink.manual_duration_seconds !== null) {
        if (typeof drink.manual_duration_seconds !== "number" || !Number.isFinite(drink.manual_duration_seconds) || drink.manual_duration_seconds < 0) {
          return NextResponse.json({ error: "Invalid manual_duration_seconds in drink" }, { status: 400 });
        }
      }
    }

    // Fetch and validate session
    const [session] = await sql`
      SELECT * FROM sessions
      WHERE id = ${sessionId} AND user_id = ${userId} AND end_time IS NULL
    `;
    if (!session) {
      return NextResponse.json({ error: "Session not found, belongs to another user, or is already ended" }, { status: 404 });
    }

    // TODO: Future - support group rounds with group_session_id validation
    // TODO: Future - notify round participants after successful logging

    // Insert all drinks in a transaction
    const loggedDrinks = [];
    const now = new Date().toISOString();

    for (let i = 0; i < drinksList.length; i++) {
      const drink = drinksList[i];
      const drinkType = drink.type as DrinkType;

      // Calculate duration for this drink
      let duration_seconds: number | null = null;
      let timing_method: "gap" | "stopwatch" = "gap";

      if (
        typeof drink.manual_duration_seconds === "number" &&
        drink.manual_duration_seconds >= MIN_REALISTIC_SECONDS &&
        drink.manual_duration_seconds <= MAX_SPEED_SECONDS
      ) {
        duration_seconds = Math.floor(drink.manual_duration_seconds);
        timing_method = "stopwatch";
      } else {
        // Gap-based: time since last drink in this session (in order of drinks array)
        if (i > 0 && loggedDrinks[i - 1].logged_at) {
          const lastTime = new Date(loggedDrinks[i - 1].logged_at);
          const gap = Math.floor((new Date(now).getTime() - lastTime.getTime()) / 1000);
          duration_seconds = normalizeDuration(gap);
        } else {
          // First drink in round: use gap from last drink in session
          const [previousDrink] = await sql`
            SELECT logged_at
            FROM drinks
            WHERE session_id = ${sessionId}
            ORDER BY logged_at DESC
            LIMIT 1
          `;
          if (previousDrink) {
            const lastTime = new Date(previousDrink.logged_at);
            const gap = Math.floor((new Date(now).getTime() - lastTime.getTime()) / 1000);
            duration_seconds = normalizeDuration(gap);
          }
        }
      }

      const [insertedDrink] = await sql`
        INSERT INTO drinks (session_id, type, logged_at, duration_seconds, timing_method, round_id)
        VALUES (${sessionId}, ${drinkType}, ${now}, ${duration_seconds}, ${timing_method}, ${round_id})
        RETURNING *
      `;
      loggedDrinks.push(insertedDrink);
    }

    // Recalculate confidence for the session
    const allDrinks = await sql`
      SELECT type, logged_at FROM drinks WHERE session_id = ${sessionId} ORDER BY logged_at ASC
    `;
    const conf = calculateConfidence(allDrinks as DrinkLog[]);

    await sql`
      UPDATE sessions SET
        peak_confidence_pct = GREATEST(peak_confidence_pct, ${conf.peak}),
        peak_stage = CASE
          WHEN ${conf.peak} > peak_confidence_pct THEN ${conf.peakStage}
          ELSE peak_stage
        END,
        peak_confidence_updated_at = CASE
          WHEN ${conf.peak} > peak_confidence_pct THEN ${now}
          ELSE COALESCE(peak_confidence_updated_at, ${now})
        END
      WHERE id = ${sessionId}
    `;

    // Update PBs for any PRs
    const [userRow] = await sql`SELECT * FROM users WHERE id = ${userId}`;

    const prUpdates: Record<DrinkType, number | null> = {
      beer: null,
      shot: null,
      wine: null,
      cocktail: null,
      spirit: null,
    };

    for (const drink of loggedDrinks) {
      if (drink.duration_seconds !== null) {
        const drinkType = drink.type as DrinkType;
        const pbCol = `pb_${drinkType}_seconds`;
        const currentPB = userRow?.[pbCol];

        const isPR = currentPB === null || drink.duration_seconds < currentPB;
        if (isPR) {
          prUpdates[drinkType] = drink.duration_seconds;
        }
      }
    }

    // Apply PR updates
    if (prUpdates.beer !== null) await sql`UPDATE users SET pb_beer_seconds = ${prUpdates.beer} WHERE id = ${userId}`;
    if (prUpdates.shot !== null) await sql`UPDATE users SET pb_shot_seconds = ${prUpdates.shot} WHERE id = ${userId}`;
    if (prUpdates.wine !== null) await sql`UPDATE users SET pb_wine_seconds = ${prUpdates.wine} WHERE id = ${userId}`;
    if (prUpdates.cocktail !== null) await sql`UPDATE users SET pb_cocktail_seconds = ${prUpdates.cocktail} WHERE id = ${userId}`;
    if (prUpdates.spirit !== null) await sql`UPDATE users SET pb_spirit_seconds = ${prUpdates.spirit} WHERE id = ${userId}`;

    return NextResponse.json(
      {
        success: true,
        round_id,
        drinks_logged: loggedDrinks.length,
        drinks: loggedDrinks,
        confidence: conf,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    logError({ context: "POST /api/drinks (round batch)", message: "Failed to log round", data: err });
    return NextResponse.json({ error: "Failed to log round" }, { status: 500 });
  }
}
