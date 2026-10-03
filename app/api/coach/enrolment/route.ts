import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/coach/enrolment ─────────────────────────────────────────────────────
// The other half of self-registration: a coach sees the pool of athletes who
// signed up for their sport and haven't been placed in a team yet, and assigns
// each to one of their teams.
//
// Scoping: a coach only ever sees pending athletes in THEIR sport (and, for a
// team-scoped coach, only those whose age group matches a team they coach).
// The medical DETAIL never comes through here — only the clearance flag, via
// the same get_clearance_flags path a normal coach is allowed.
//
// GET  → pending athletes for this coach, each with their clearance flag
// POST { athleteId, team } → place the athlete in that team (clears pending)

async function staffContext(email: string | null | undefined, schoolId: string) {
  if (!email) return null;
  const { data } = await getAdmin().from('staff_roles')
    .select('role, sport, teams, is_active').eq('email', email).eq('school_id', schoolId).maybeSingle();
  if (!data || data.is_active !== true) return null;
  const schoolWide = ['owner', 'head_of_sport', 'deputy_head_of_sport'].includes(String(data.role));
  return {
    role: data.role as string,
    sport: data.sport as string | null,
    teams: Array.isArray(data.teams) ? data.teams as string[] : [],
    schoolWide,
  };
}

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const ctx = await staffContext(auth.email, schoolId);
  if (!ctx) return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });

  const db = getAdmin();

  // Pending, self-registered athletes in this school. Scope by sport unless
  // the caller is school-wide (head of sport sees every sport's pending pool).
  let q = db.from('athletes')
    .select('id,full_name,age_group,grade,sport,position,height_cm,weight_kg,date_of_birth')
    .eq('school_id', schoolId).eq('pending_team', true).eq('is_active', true)
    .order('created_at', { ascending: false });

  if (!ctx.schoolWide && ctx.sport) q = q.eq('sport', ctx.sport);

  const { data: pending } = await q;

  // Clearance flags (category only — never the medical detail).
  const { data: flags } = await db.rpc('get_clearance_flags', { p_school: schoolId });
  const flagMap = new Map((flags || []).map((f: { athlete_id: string; clearance_status: string }) => [f.athlete_id, f.clearance_status]));

  // Which teams can this coach assign into? School-wide: all teams in the
  // sport. Team coach: only their assigned teams.
  const { data: schoolSports } = await db.from('school_sports').select('sport_key').eq('school_id', schoolId);
  const sportsRun = (schoolSports || []).map(s => s.sport_key);

  return NextResponse.json({
    pending: (pending || []).map(a => ({
      ...a,
      clearance: flagMap.get(a.id) || null,
    })),
    assignableTeams: ctx.schoolWide ? null : ctx.teams,   // null = any team in sport
    coachSport: ctx.sport,
    schoolWide: ctx.schoolWide,
    sportsRun,
  });
}

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const ctx = await staffContext(auth.email, schoolId);
  if (!ctx) return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const athleteId = String(body.athleteId || '');
  const team = String(body.team || '').trim();
  if (!athleteId || !team) return NextResponse.json({ error: 'Athlete and team required.' }, { status: 400 });

  const db = getAdmin();

  // The athlete must be a pending one in this school and this coach's sport.
  const { data: athlete } = await db.from('athletes')
    .select('id,school_id,sport,pending_team').eq('id', athleteId).maybeSingle();
  if (!athlete || athlete.school_id !== schoolId) {
    return NextResponse.json({ error: 'Athlete not found.' }, { status: 404 });
  }
  if (!ctx.schoolWide && ctx.sport && athlete.sport !== ctx.sport) {
    return NextResponse.json({ error: 'Not your sport.' }, { status: 403 });
  }
  // A team-scoped coach can only place into one of their own teams.
  if (!ctx.schoolWide && ctx.teams.length && !ctx.teams.includes(team)) {
    return NextResponse.json({ error: 'You can only assign to your own teams.' }, { status: 403 });
  }

  const { error } = await db.from('athletes')
    .update({ team, pending_team: false }).eq('id', athleteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
