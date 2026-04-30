import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import sql from "@/lib/db";
import { calculateConfidence, getStage } from "@/lib/confidence";
import { MAX_SPEED_SECONDS, MIN_REALISTIC_SECONDS, normalizeDuration } from "@/lib/drink-speed";
import { drinksLimiter } from "@/lib/rate-limit";

const VALID_DRINK_TYPES = new Set(["beer", "shot", "wine", "cocktail", "spirit"] as const);
type DrinkType = "beer" | "shot" | "wine" | "cocktail" | "spirit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// POST /api/drinks - log a drink in the active session
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const { session_id, type, logged_at, manual_duration_seconds } = body;

  if (!session_id || !type) {
    return NextResponse.json({ error: "session_id and type required" }, { status: 400 });
  }

  // Validate session_id format to prevent unexpected values reaching the DB
  if (typeof session_id !== "string" || !UUID_RE.test(session_id)) {
    return NextResponse.json({ error: "Invalid session_id" }, { status: 400 });
  }

  // Strict enum check — reject unknown drink types before they reach the DB
  if (typeof type !== "string" || !VALID_DRINK_TYPES.has(type as DrinkType)) {
    return NextResponse.json(
      { error: `Invalid drink type. Must be one of: ${[...VALID_DRINK_TYPES].join(", ")}` },
      { status: 400 }
    );
  }

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
    VALUES (${session_id}, ${type}, ${drinkIso}, ${duration_seconds}, ${timing_method})
    RETURNING *
  `;

  // Recalculate confidence from all drinks
  const allDrinks = await sql`
    SELECT type, logged_at FROM drinks WHERE session_id = ${session_id} ORDER BY logged_at ASC
  `;
  const conf = calculateConfidence(allDrinks as any);

  await sql`
    UPDATE sessions SET
      peak_confidence_pct = GREATEST(peak_confidence_pct, ${conf.peak}),
      peak_stage = ${getStage(conf.peak)}
    WHERE id = ${session_id}
  `;

  // PR check using cached user PBs
  let is_pr = false;
  if (duration_seconds !== null) {
    const [userRow] = await sql`SELECT * FROM users WHERE id = ${user.id}`;

    const pbCol = `pb_${type}_seconds`;
    const currentPB = userRow?.[pbCol];

    is_pr = currentPB === null || duration_seconds < currentPB;

    if (is_pr) {
      if (type === "beer") await sql`UPDATE users SET pb_beer_seconds = ${duration_seconds} WHERE id = ${user.id}`;
      else if (type === "shot") await sql`UPDATE users SET pb_shot_seconds = ${duration_seconds} WHERE id = ${user.id}`;
      else if (type === "wine") await sql`UPDATE users SET pb_wine_seconds = ${duration_seconds} WHERE id = ${user.id}`;
      else if (type === "cocktail") await sql`UPDATE users SET pb_cocktail_seconds = ${duration_seconds} WHERE id = ${user.id}`;
      else if (type === "spirit") await sql`UPDATE users SET pb_spirit_seconds = ${duration_seconds} WHERE id = ${user.id}`;
    }
  }

  return NextResponse.json({ drink, confidence: conf, is_pr }, { status: 201 });
}
