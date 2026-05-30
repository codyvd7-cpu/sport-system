import { NextRequest, NextResponse } from 'next/server';

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

  // Rate limit player routes
  if (pathname.startsWith('/player/') && pathname.length > '/player/'.length) {
    if (!checkRateLimit(`player:${ip}`, 10, 60_000)) {
      return new NextResponse(JSON.stringify({ error: 'Too many attempts.' }), { status: 429 });
    }
  }

  // Rate limit API routes
  if (pathname.startsWith('/api/')) {
    if (!checkRateLimit(`api:${ip}`, 120, 60_000)) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests.' }), { status: 429 });
    }
  }

  // Portal auth check
  if (pathname === '/portal') {
    const portalCookie = req.cookies.get('portal_access');
    if (!portalCookie?.value) {
      return NextResponse.redirect(new URL('/portal-login', req.url));
    }
    try {
      const [payload, sig] = decodeURIComponent(portalCookie.value).split('.');
      if (!payload || !sig) return NextResponse.redirect(new URL('/portal-login', req.url));
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      if (!decoded.exp || decoded.exp < Date.now()) {
        return NextResponse.redirect(new URL('/portal-login', req.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/portal-login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/player/:path*', '/api/:path*', '/portal'],
};