import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/lib/auth";
import { generateSessionTitle } from "@/lib/groq";
import { titleLimiter } from "@/lib/rate-limit";

// POST /api/title — generate session title via Groq
export async function POST(req: Request) {
  const user = await getOrCreateUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
}
