import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { createHash } from 'crypto';

// ─── /api/platform/schools ────────────────────────────────────────────────────
// Platform-level school management — creating and editing the schools that use
// Altus. This is deliberately NOT a school-level "owner" capability: a school's
// own owner administers their school, but only the platform operator can create
// or list other schools. Gated on PLATFORM_ADMIN_EMAILS (comma-separated env
// var) rather than any in-app role, since no in-app role means "runs Altus".

function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok || !isPlatformAdmin(auth.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const { data, error } = await getAdmin()
    .from('schools')
    .select('id,name,short_name,abbreviation,slug,logo_url,primary_color,accent_color,latitude,longitude,is_active,created_at')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Athlete + staff counts give a quick sense of whether a school is live.
  const withCounts = await Promise.all((data || []).map(async (s) => {
    const [athletes, staff] = await Promise.all([
      getAdmin().from('athletes').select('id', { count: 'exact', head: true }).eq('school_id', s.id),
      getAdmin().from('staff_roles').select('id', { count: 'exact', head: true }).eq('school_id', s.id),
    ]);
    return { ...s, athleteCount: athletes.count ?? 0, staffCount: staff.count ?? 0 };
  }));

  return NextResponse.json({ schools: withCounts });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok || !isPlatformAdmin(auth.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const shortName = String(body.shortName || '').trim();
  const abbreviation = String(body.abbreviation || '').trim().toUpperCase();
  const slug = String(body.slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

  if (!name || !shortName || !abbreviation || !slug) {
    return NextResponse.json({ error: 'Name, short name, abbreviation and slug are all required.' }, { status: 400 });
  }

  const db = getAdmin();

  // Slug is used in portal URLs and must be unique — check up front so the
  // error is understandable rather than a raw constraint violation.
  const { data: existing } = await db.from('schools').select('id').eq('slug', slug).maybeSingle();
  if (existing) {
    return NextResponse.json({ error: `The slug "${slug}" is already taken by another school.` }, { status: 409 });
  }

  const { data, error } = await db.from('schools').insert([{
    name,
    short_name: shortName,
    abbreviation,
    slug,
    logo_url: body.logoUrl?.trim() || null,
    primary_color: body.primaryColor?.trim() || '#38bdf8',
    accent_color: body.accentColor?.trim() || '#a78bfa',
    latitude: body.latitude != null && body.latitude !== '' ? Number(body.latitude) : -26.2041,
    longitude: body.longitude != null && body.longitude !== '' ? Number(body.longitude) : 28.0473,
    is_active: true,
  }]).select('id,name,slug').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate the school's access codes automatically. Without this, a new
  // school is created but nobody can actually get into its HP module or
  // parent portal until someone hand-writes rows in Supabase.
  const randomCode = (prefix: string) => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let out = '';
    for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `${prefix}-${out}`;
  };

  const hpCoachCode = randomCode(`${abbreviation}HP`);
  const hpAdminCode = randomCode(`${abbreviation}ADM`);

  // Only the sports this school actually runs — generating codes for all seven
  // would hand a hockey-and-cricket school four codes they'll never use, and
  // put sports they don't offer into their navigation.
  const ALL_SPORTS = ['hockey', 'rugby', 'cricket', 'swimming', 'rowing', 'waterpolo', 'football'];
  const requested: string[] = Array.isArray(body.sports) && body.sports.length
    ? body.sports.filter((sp: string) => ALL_SPORTS.includes(sp))
    : ALL_SPORTS;

  // portal_access_codes stores hashes, not plain codes — keep the readable one
  // in memory only long enough to show it to the operator once.
  const portalPlain = requested.map(sport => ({
    sport,
    code: randomCode(`${abbreviation}${sport.slice(0, 3).toUpperCase()}`),
  }));
  const portalCodes = portalPlain.map(p => ({
    school_id: data.id,
    sport: p.sport,
    code_hash: createHash('sha256').update(p.code.toLowerCase()).digest('hex'),
  }));

  const [hpRes, portalRes, sportsRes] = await Promise.all([
    db.from('hp_access_codes').insert([
      { school_id: data.id, code: hpCoachCode, role: 'hp-coach', is_active: true },
      { school_id: data.id, code: hpAdminCode, role: 'hp-admin', is_active: true },
    ]),
    db.from('portal_access_codes').insert(portalCodes),
    db.from('school_sports').insert(
      requested.map((sport, i) => ({ school_id: data.id, sport_key: sport, sort_order: i + 1, is_active: true }))
    ),
  ]);

  // The school itself exists either way — surface code failures rather than
  // failing the whole creation, so it can be retried without a duplicate school.
  const codeWarnings: string[] = [];
  if (hpRes.error) codeWarnings.push(`HP codes: ${hpRes.error.message}`);
  if (portalRes.error) codeWarnings.push(`Portal codes: ${portalRes.error.message}`);
  if (sportsRes.error) codeWarnings.push(`Sports: ${sportsRes.error.message}`);

  return NextResponse.json({
    ok: true,
    school: data,
    codes: {
      hpCoach: hpCoachCode,
      hpAdmin: hpAdminCode,
      portal: Object.fromEntries(portalPlain.map(c => [c.sport, c.code])),
    },
    warnings: codeWarnings.length ? codeWarnings : undefined,
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok || !isPlatformAdmin(auth.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'School id required.' }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.name != null)         patch.name = String(body.name).trim();
  if (body.shortName != null)    patch.short_name = String(body.shortName).trim();
  if (body.abbreviation != null) patch.abbreviation = String(body.abbreviation).trim().toUpperCase();
  if (body.logoUrl != null)      patch.logo_url = String(body.logoUrl).trim() || null;
  if (body.primaryColor != null) patch.primary_color = String(body.primaryColor).trim();
  if (body.accentColor != null)  patch.accent_color = String(body.accentColor).trim();
  if (body.latitude != null && body.latitude !== '')   patch.latitude = Number(body.latitude);
  if (body.longitude != null && body.longitude !== '') patch.longitude = Number(body.longitude);
  if (body.isActive != null)     patch.is_active = !!body.isActive;

  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  }

  const { error } = await getAdmin().from('schools').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
