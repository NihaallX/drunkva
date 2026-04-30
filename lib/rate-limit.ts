/**
 * Lightweight in-process sliding-window rate limiter.
 *
 * Suitable for serverless API routes where an external Redis store would add
 * unnecessary latency for low-volume endpoints. Each serverless instance
 * maintains its own window, so limits are per-instance — this is intentionally
 * conservative (real throughput is lower than the limit across all instances).
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   const result = limiter.check(userId);
 *   if (!result.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimitOptions {
  /** Rolling window size in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed per window per key */
  max: number;
}

interface RateLimitResult {
  allowed: boolean;
  /** How many requests remain in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the current window resets */
  resetAt: number;
}

interface WindowEntry {
  timestamps: number[];
}

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max } = options;
  const store = new Map<string, WindowEntry>();

  // Periodically prune stale entries to prevent unbounded memory growth
  // (only in long-running environments; no-op in short-lived serverless instances)
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);
        if (entry.timestamps.length === 0) store.delete(key);
      }
    }, windowMs).unref?.();
  }

  return {
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key) ?? { timestamps: [] };

      // Evict timestamps outside the current window
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

      const resetAt = (entry.timestamps[0] ?? now) + windowMs;

      if (entry.timestamps.length >= max) {
        store.set(key, entry);
        return { allowed: false, remaining: 0, resetAt };
      }

      entry.timestamps.push(now);
      store.set(key, entry);

      return {
        allowed: true,
        remaining: max - entry.timestamps.length,
        resetAt,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Pre-built limiters for specific endpoints
// ---------------------------------------------------------------------------

/** /api/title — Groq LLM: max 5 calls per user per minute */
export const titleLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

/** /api/drinks — log drink: max 60 calls per user per minute (generous for real use, blocks floods) */
export const drinksLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });
