import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

const COOKIE_NAME = 'hp_session';
const TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function POST(req: NextRequest) {
  // Rate limit failed attempts: 5 per minute per IP
  const ip = getClientId(req);
  const rl = await rateLimit(`hp-login:${ip}`, { max: 8, windowMs: 60_000 });
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

    // Multi-school: per-school codes live in hp_access_codes, and the code
    // itself is what tells us which school this session belongs to (there's
    // no user account behind HP auth to look a school up from). The legacy
    // env-var codes still work and resolve to School 1, so existing access
    // isn't broken by this.
    let role: string | null = null;
    let schoolId: string | null = null;

    if (adminConfigured()) {
      const { data: rows } = await getAdmin()
        .from('hp_access_codes').select('code,role,school_id').eq('is_active', true);
      for (const row of rows || []) {
        if (matches(row.code)) { role = row.role; schoolId = row.school_id; break; }
      }
    }

    if (!role) {
      role = matches(adminCode) ? 'hp-admin' : matches(coachCode) ? 'hp-coach' : null;
      if (role) schoolId = '00000000-0000-0000-0000-000000000001'; // legacy env codes → School 1
    }

    if (!role) {
      return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 });
    }

    // Build signed token (role + school travel in the payload — the school is
    // what every HP API route needs to scope its queries by)
    const payload = Buffer.from(JSON.stringify({
      exp: Date.now() + TTL_MS,
      iat: Date.now(),
      role,
      schoolId,
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
