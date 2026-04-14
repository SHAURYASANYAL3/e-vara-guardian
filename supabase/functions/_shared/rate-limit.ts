/**
 * In-memory sliding-window rate limiter for edge functions.
 *
 * Uses IP + function name as the key.  Because edge-function instances are
 * ephemeral the window resets on cold starts, but this is still effective
 * against burst / brute-force abuse within a single instance lifetime.
 *
 * Production upgrade path: swap for a Redis / Upstash-based counter.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1 minute window
const CLEANUP_INTERVAL = 300_000; // prune stale keys every 5 min

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export interface RateLimitOptions {
  /** Max requests per window (default 20) */
  maxRequests?: number;
  /** Window length in ms (default 60 000) */
  windowMs?: number;
}

export function checkRateLimit(
  req: Request,
  functionName: string,
  options: RateLimitOptions = {},
): { allowed: boolean; retryAfterMs: number } {
  const { maxRequests = 20, windowMs = WINDOW_MS } = options;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";

  const key = `${functionName}:${ip}`;
  const now = Date.now();

  cleanup();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Prune old timestamps for this key
  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = windowMs - (now - oldest);
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfterMs: 0 };
}

export function rateLimitResponse(retryAfterMs: number, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again shortly." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      },
    },
  );
}
