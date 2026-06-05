import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientId } from '@/lib/rateLimit';

const COOKIE_NAME = 'portal_access';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Sport-specific access codes from env vars
function getExpectedCode(sport: string): string | undefined {
  switch (sport) {
    case 'rugby':     return process.env.PORTAL_ACCESS_CODE_RUGBY;
    case 'cricket':   return process.env.PORTAL_ACCESS_CODE_CRICKET;
    case 'rowing':    return process.env.PORTAL_ACCESS_CODE_ROWING;
    case 'swimming':  return process.env.PORTAL_ACCESS_CODE_SWIMMING;
    case 'waterpolo': return process.env.PORTAL_ACCESS_CODE_WATERPOLO;
    default:          return process.env.PORTAL_ACCESS_CODE; // hockey
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`portal-login:${ip}`, { max: 8, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Wait a minute.' }, { status: 429 });
  }

  const secret = process.env.HP_SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Portal access not configured.' }, { status: 500 });
  }

  try {
    const { code, sport } = await req.json();
    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
    }

    const expectedCode = getExpectedCode(sport || 'hockey');
    if (!expectedCode) {
      return NextResponse.json({ error: 'Portal access not configured.' }, { status: 500 });
    }

    const provided = Buffer.from(code.trim().toLowerCase());
    const expected = Buffer.from(expectedCode.toLowerCase());
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 });
    }

    const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS, iat: Date.now(), sport: sport || 'hockey' })).toString('base64');
    const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const cookieValue = `${payload}.${sig}`;

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(TTL_MS / 1000),
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}