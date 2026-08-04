import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

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
  const rl = await rateLimit(`portal-login:${ip}`, { max: 8, windowMs: 60_000 });
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

    const resolvedSport = sport || 'hockey';
    const provided = Buffer.from(code.trim().toLowerCase());
    const matches = (expected?: string) => {
      if (!expected) return false;
      const buf = Buffer.from(expected.toLowerCase());
      return provided.length === buf.length && crypto.timingSafeEqual(provided, buf);
    };

    // Multi-school: codes live in portal_access_codes, and the code is what
    // tells us which school this parent belongs to (there's no account behind
    // portal access). Legacy env-var codes still work and resolve to School 1.
    let schoolId: string | null = null;
    let matched = false;

    if (adminConfigured()) {
      const { data: rows } = await getAdmin()
        .from('portal_access_codes').select('code,school_id')
        .eq('sport', resolvedSport).eq('is_active', true);
      for (const row of rows || []) {
        if (matches(row.code)) { matched = true; schoolId = row.school_id; break; }
      }
    }

    if (!matched && matches(getExpectedCode(resolvedSport))) {
      matched = true;
      schoolId = '00000000-0000-0000-0000-000000000001'; // legacy env codes → School 1
    }

    if (!matched) {
      return NextResponse.json({ error: 'Incorrect access code.' }, { status: 401 });
    }

    const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL_MS, iat: Date.now(), sport: resolvedSport, schoolId })).toString('base64');
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
    // Readable by the client — lets /portal, /portal-login and /login default to
    // the parent's sport when no ?sport= param is present.
    res.cookies.set('portal_sport', resolvedSport, {
      httpOnly: false,
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