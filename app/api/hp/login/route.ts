import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientId } from '@/lib/rateLimit';

const COOKIE_NAME = 'hp_session';
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function POST(req: NextRequest) {
  // Rate limit failed attempts: 5 per minute per IP
  const ip = getClientId(req);
  const rl = rateLimit(`hp-login:${ip}`, { max: 8, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Wait a minute and try again.' }, { status: 429 });
  }

  const coachCode = process.env.HP_ACCESS_CODE;       // server-only, NOT NEXT_PUBLIC
  const adminCode = process.env.HP_ADMIN_ACCESS_CODE; // optional elevated code
  const secret = process.env.HP_SESSION_SECRET;

  if (!coachCode || !secret) {
    return NextResponse.json({ error: 'HP access not configured on server.' }, { status: 500 });
  }

  try {
    const { code } = await req.json();
    if (typeof code !== 'string' || code.length === 0 || code.length > 100) {
      return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
    }

    // Constant-time comparison to prevent timing attacks — check both codes
    const provided = Buffer.from(code.trim().toLowerCase());
    const matches = (expected?: string) => {
      if (!expected) return false;
      const buf = Buffer.from(expected.toLowerCase());
      return provided.length === buf.length && crypto.timingSafeEqual(provided, buf);
    };
    const role = matches(adminCode) ? 'hp-admin' : matches(coachCode) ? 'hp-coach' : null;
    if (!role) {
      return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 });
    }

    // Build signed token (role travels in the payload for permissions + audit attribution)
    const payload = Buffer.from(JSON.stringify({
      exp: Date.now() + TTL_MS,
      iat: Date.now(),
      role,
    })).toString('base64');
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
  } catch (e: any) {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// Logout — clears the cookie
export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
