import { NextResponse } from "next/server";
import sql from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";

const waitlistLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(req: Request): string {
  const headerValue =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  return headerValue.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req);
    const limit = waitlistLimiter.check(clientIp);

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
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
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const rawName = typeof body.name === "string" ? body.name.trim() : "";

    if (!rawEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!EMAIL_RE.test(rawEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const email = rawEmail.toLowerCase();
    const name = rawName || null;

    await sql`
      INSERT INTO waitlist (email, name)
      VALUES (${email}, ${name})
      ON CONFLICT (email) DO NOTHING
    `;

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/waitlist failed", err);
    return NextResponse.json({ error: "Failed to save waitlist entry" }, { status: 500 });
  }
}