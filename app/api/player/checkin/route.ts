import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { verifyHpCookie } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { verifyPlayer, requireAthleteId } from '@/lib/playerAuth';

// ─── /api/player/checkin ────────────────────────────────────────────────────────
// QR gym check-in.
//
// Token format (static per venue, printed as a QR poster):
//   v1.<base64url(venue)>.<hmac-sha256(venue, secret) first 24 hex>
// The QR encodes a URL: https://<site>/player/checkin?t=<token> — so scanning
// with the normal phone camera works, and the in-profile scanner reads the same.
//
// GET  ?make=<venue>   (staff, HP cookie)   → token + full URL for QR printing
// POST { token }       (player, Bearer JWT) → verify + insert check-in
//
// Trust model: self-reported. Once per athlete/venue/day enforced by DB
// constraint; logged separately from coach-taken registers.

function secret() {
  return process.env.GYM_QR_SECRET || process.env.HP_SESSION_SECRET || '';
}
function signVenue(venue: string) {
  return crypto.createHmac('sha256', secret()).update(`gym-checkin:${venue}`).digest('hex').slice(0, 24);
}
function makeToken(venue: string) {
  const b64 = Buffer.from(venue, 'utf8').toString('base64url');
  return `v1.${b64}.${signVenue(venue)}`;
}
function parseToken(token: string): string | null {
  const parts = (token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  let venue = '';
  try { venue = Buffer.from(parts[1], 'base64url').toString('utf8'); } catch { return null; }
  if (!venue || venue.length > 60) return null;
  const expected = Buffer.from(signVenue(venue));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return venue;
}

// ── Staff: generate the QR payload for a venue ─────────────────────────────────
export async function GET(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!secret()) return NextResponse.json({ error: 'GYM_QR_SECRET not configured.' }, { status: 500 });
  const venue = (req.nextUrl.searchParams.get('make') || '').trim();
  if (!venue) return NextResponse.json({ error: 'Venue required.' }, { status: 400 });
  const token = makeToken(venue);
  const origin = req.nextUrl.origin;
  return NextResponse.json({ venue, token, url: `${origin}/player/checkin?t=${token}` });
}

// ── Player: check in ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`gym-checkin:${ip}`, { max: 12, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Slow down — try again in a minute.' }, { status: 429 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  if (!secret()) return NextResponse.json({ error: 'Check-in not configured on server.' }, { status: 500 });

  const db = getAdmin();
  const player = await verifyPlayer(req);
  if (!player) return NextResponse.json({ error: 'Sign in to check in.' }, { status: 401 });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch {}
  const venue = parseToken(String(body.token || ''));
  if (!venue) return NextResponse.json({ error: 'That QR code isn\u2019t valid. Ask a coach for the current poster.' }, { status: 400 });

  const athleteId = await requireAthleteId(player.userId);
  if (!athleteId) {
    return NextResponse.json({ error: 'Link your athlete record first (Profile → Settings).' }, { status: 400 });
  }

  const { error: insErr } = await db.from('gym_checkins').insert([{ athlete_id: athleteId, venue, source: 'qr' }]);
  if (insErr) {
    if (/duplicate|unique/i.test(insErr.message)) {
      return NextResponse.json({ ok: true, already: true, venue });
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, already: false, venue });
}
