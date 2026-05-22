import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter for edge runtime
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

  // ── 1. Block Vercel preview deployments from accessing real data ──────────
  // Vercel sets x-vercel-deployment-url on preview deployments.
  // We allow the main production domain and localhost only.
  const host = req.headers.get('host') || '';
  const isPreview =
    host.includes('.vercel.app') &&
    !host.startsWith('sport-system-rosy.vercel.app') && // your production domain
    process.env.NODE_ENV === 'production';

  if (isPreview) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:40px;background:#030810;color:#94a3b8">
        <h1 style="color:#f87171">Preview Access Restricted</h1>
        <p>This preview deployment does not serve real data.</p>
        <p>Visit the <a href="https://sport-system-rosy.vercel.app" style="color:#38bdf8">live site</a>.</p>
       </body></html>`,
      { status: 403, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // ── 2. Rate limit player code entry (brute force protection) ─────────────
  // /player page POST-equivalent: the actual lookup is done client-side via Supabase,
  // but we can rate-limit /player/[code] route access here.
  if (pathname.startsWith('/player/') && pathname.length > '/player/'.length) {
    const allowed = checkRateLimit(`player:${ip}`, 10, 60_000); // 10 per minute per IP
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many attempts. Please wait a minute.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── 3. Rate limit API routes broadly ────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const allowed = checkRateLimit(`api:${ip}`, 120, 60_000); // 120 per minute per IP
    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── 4. Redirect /portal to /portal-login if not authenticated ────────────
  // The portal shows athlete names and leaderboards — needs gating.
  // We use a simple cookie check here; the portal-login page sets it.
  if (pathname === '/portal' || pathname.startsWith('/portal#')) {
    const portalAccess = req.cookies.get('portal_access');
    if (!portalAccess?.value) {
      return NextResponse.redirect(new URL('/portal-login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/player/:path*',
    '/api/:path*',
    '/portal',
  ],
};
