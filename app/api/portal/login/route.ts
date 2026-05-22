import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientId } from '@/lib/rateLimit';

const COOKIE_NAME = 'portal_access';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`portal-login:${ip}`, { max: 8, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Wait a minute.' }, { status: 429 });
  }

  const expectedCode = process.env.PORTAL_ACCESS_CODE;
  const secret = process.env.HP_SESSION_SECRET; // reuse same secret

  if (!expectedCode || !secret) {
    return NextResponse.json({ error: 'Portal access not configured.' }, { status: 500 });
  }

  try {
    const { code } = await req.json();
    if (typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
    }

    const provided = Buffer.from(code.trim().toLowerCase());
    const expected = Buffer.from(expectedCode.toLowerCase());
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 });
    }

    const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS, iat: Date.now() })).toString('base64');
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
