// Lightweight in-memory rate limiter (per-IP, per-route).
// For multi-instance production, swap to Upstash Redis or similar.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
  }, 60_000);
}

export function rateLimit(
  identifier: string,
  options: { max: number; windowMs: number } = { max: 10, windowMs: 60_000 }
): { ok: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const bucket = buckets.get(identifier);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(identifier, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.max - 1, resetIn: options.windowMs };
  }

  if (bucket.count >= options.max) {
    return { ok: false, remaining: 0, resetIn: bucket.resetAt - now };
  }

  bucket.count++;
  return { ok: true, remaining: options.max - bucket.count, resetIn: bucket.resetAt - now };
}

export function getClientId(req: Request): string {
  // Prefer x-forwarded-for (Vercel sets this)
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}
