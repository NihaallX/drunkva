import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateSessionTitle } from "@/lib/groq";
import { createRateLimiter } from "@/lib/rate-limit";

const titleLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

// POST /api/title — generate session title via Groq
export async function POST(req: Request) {
  try {
    const user = await requireAuth();

    const limit = titleLimiter.check(String(user.id));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait before generating another title." },
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

    const body = await req.json();
    const { drink_count, dominant_drink_type, peak_stage, venue_name, start_hour } = body;

    const title = await generateSessionTitle({
      drink_count: drink_count ?? 0,
      dominant_drink_type: dominant_drink_type ?? "beer",
      peak_stage: peak_stage ?? "Baseline",
      venue_name: venue_name ?? "the bar",
      start_hour: start_hour ?? 20,
    });

    if (title === null) {
      return NextResponse.json({ title: null, error: "generation_failed" }, { status: 500 });
    }

    return NextResponse.json({ title });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/title failed", err);
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 });
  }
}
