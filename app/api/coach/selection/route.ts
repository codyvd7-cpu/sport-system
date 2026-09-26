import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { recordAthleteEvent } from '@/lib/athleteEvents';

// ─── /api/coach/selection ─────────────────────────────────────────────────────
// Picking a side for a fixture.
//
// This is the piece the app was missing. Fixtures recorded that a match
// exists and attendance recorded who came to training, but nothing recorded
// who is actually playing — the question every player and parent asks.
//
// The picking view deliberately returns availability, recent attendance and
// any open injury case alongside each athlete. A coach picking a team should
// not have to hold "who's been turning up" in their head or check a second
// screen; it's also what finally gives attendance a consequence.
//
// Selections are never exposed on the public portal — a team sheet naming who
// was dropped is a pastoral problem when the subjects are children. They
// appear only on the athlete's own profile.
//
// GET  ?fixtureId=   → the fixture, current selection, and the squad to pick from
// POST { fixtureId, team, players[], logistics } → save (draft or publish)

/**
 * Whether this staff member may pick this team. School-wide roles can pick
 * any side; a team-scoped coach only their own. Checked server-side on every
 * call rather than trusting the UI to hide the screen.
 */
async function mayPickTeam(email: string | null | undefined, schoolId: string, team: string): Promise<boolean> {
  if (!email) return false;
  const { data: staff } = await getAdmin().from('staff_roles')
    .select('role,teams,is_active').eq('email', email).maybeSingle();
  if (!staff || staff.is_active !== true) return false;
  const wide = ['owner', 'head_of_sport', 'deputy_head_of_sport', 'mic'];
  if (wide.includes(String(staff.role))) return true;
  return Array.isArray(staff.teams) && staff.teams.includes(team);
}

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const fixtureId = req.nextUrl.searchParams.get('fixtureId');
  if (!fixtureId) return NextResponse.json({ error: 'fixtureId required.' }, { status: 400 });

  const db = getAdmin();
  const { data: fixture } = await db.from('portal_fixtures')
    .select('id,team,opponent,fixture_date,fixture_time,venue,home_away,sport,school_id')
    .eq('id', fixtureId).maybeSingle();

  if (!fixture || fixture.school_id !== schoolId) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  if (!(await mayPickTeam(auth.email, schoolId, fixture.team))) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  const { data: squad } = await db.from('athletes')
    .select('id,full_name,position,availability,team')
    .eq('school_id', schoolId).eq('team', fixture.team).eq('is_active', true)
    .order('full_name');

  const ids = (squad || []).map(a => a.id);

  // Recent attendance and open injuries, so the coach can see form and
  // fitness while picking rather than guessing.
  const since = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);
  const [attRes, rtpRes, selRes] = await Promise.all([
    ids.length
      ? db.from('attendance').select('athlete_id,status').in('athlete_id', ids).gte('session_date', since)
      : Promise.resolve({ data: [] as { athlete_id: string; status: string }[] }),
    ids.length
      ? db.from('rtp_cases').select('athlete_id,injury_summary,expected_return,current_stage_id')
          .in('athlete_id', ids).eq('status', 'open')
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    db.from('team_selections').select('*').eq('fixture_id', fixtureId).eq('team', fixture.team).maybeSingle(),
  ]);

  const attByAthlete = new Map<string, { total: number; present: number }>();
  for (const r of (attRes.data || []) as { athlete_id: string; status: string }[]) {
    const e = attByAthlete.get(r.athlete_id) || { total: 0, present: 0 };
    e.total++; if (r.status === 'Present') e.present++;
    attByAthlete.set(r.athlete_id, e);
  }
  const injured = new Map<string, Record<string, unknown>>();
  for (const c of (rtpRes.data || []) as Record<string, unknown>[]) {
    injured.set(String(c.athlete_id), c);
  }

  let picked: Record<string, unknown>[] = [];
  if (selRes.data) {
    const { data } = await db.from('team_selection_players')
      .select('athlete_id,role,shirt_number,position,note')
      .eq('selection_id', selRes.data.id);
    picked = data || [];
  }

  return NextResponse.json({
    fixture,
    selection: selRes.data ?? null,
    picked,
    squad: (squad || []).map(a => {
      const att = attByAthlete.get(a.id);
      const inj = injured.get(a.id);
      return {
        ...a,
        attendedRecent: att ? att.present : null,
        sessionsRecent: att ? att.total : null,
        // Surfaced as a reason, never as a bare score — a coach should see
        // WHY an athlete is flagged, which is the same principle the Coach
        // Inbox follows.
        flag: inj
          ? `Injured — ${inj.injury_summary}`
          : a.availability && a.availability !== 'Available'
            ? a.availability
            : att && att.total >= 3 && att.present / att.total < 0.6
              ? `Missed ${att.total - att.present} of last ${att.total}`
              : null,
        selectable: !inj && (!a.availability || a.availability === 'Available'),
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const fixtureId = String(body.fixtureId || '');
  const publish = body.publish === true;
  const players: { athleteId: string; role?: string; shirtNumber?: number; position?: string; note?: string }[] =
    Array.isArray(body.players) ? body.players : [];

  if (!fixtureId) return NextResponse.json({ error: 'fixtureId required.' }, { status: 400 });

  const db = getAdmin();
  const { data: fixture } = await db.from('portal_fixtures')
    .select('id,team,opponent,fixture_date,sport,school_id').eq('id', fixtureId).maybeSingle();
  if (!fixture || fixture.school_id !== schoolId) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }
  if (!(await mayPickTeam(auth.email, schoolId, fixture.team))) {
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 });
  }

  // Every athlete named must belong to this school and this team — a client
  // could otherwise post arbitrary ids into a published selection.
  const athleteIds = players.map(p => String(p.athleteId)).filter(Boolean);
  if (athleteIds.length) {
    const { data: valid } = await db.from('athletes').select('id')
      .eq('school_id', schoolId).eq('team', fixture.team).in('id', athleteIds);
    const validSet = new Set((valid || []).map(a => a.id));
    const rogue = athleteIds.filter(id => !validSet.has(id));
    if (rogue.length) {
      return NextResponse.json({ error: 'One or more athletes are not in this team.' }, { status: 400 });
    }
  }

  const { data: selection, error: selErr } = await db.from('team_selections').upsert({
    school_id: schoolId,
    fixture_id: fixtureId,
    team: fixture.team,
    status: publish ? 'published' : 'draft',
    published_at: publish ? new Date().toISOString() : null,
    published_by: publish ? auth.email || 'staff' : null,
    meet_time: body.meetTime || null,
    meet_place: body.meetPlace || null,
    kit: body.kit || null,
    transport: body.transport || null,
    notes: body.notes || null,
    created_by: auth.email || 'staff',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'fixture_id,team' }).select('id').single();

  if (selErr || !selection) {
    return NextResponse.json({ error: selErr?.message || 'Could not save.' }, { status: 500 });
  }

  // Replace the squad wholesale — simpler and less error-prone than diffing,
  // and a selection is small.
  await db.from('team_selection_players').delete().eq('selection_id', selection.id);
  if (players.length) {
    await db.from('team_selection_players').insert(players.map(p => ({
      selection_id: selection.id,
      school_id: schoolId,
      athlete_id: p.athleteId,
      role: ['starting', 'bench', 'reserve'].includes(String(p.role)) ? p.role : 'starting',
      shirt_number: Number.isFinite(Number(p.shirtNumber)) ? Number(p.shirtNumber) : null,
      position: p.position || null,
      note: p.note || null,
    })));
  }

  // Publishing is the moment worth recording on an athlete's timeline —
  // being picked is a genuine event in their season.
  if (publish) {
    for (const p of players) {
      void recordAthleteEvent({
        athleteId: p.athleteId, schoolId, type: 'note_added',
        summary: `Selected for ${fixture.team} vs ${fixture.opponent}`,
        detail: { fixtureId, role: p.role ?? 'starting' },
        sourceTable: 'team_selections', sourceId: selection.id,
        actor: auth.email || 'staff',
      });
    }
  }

  return NextResponse.json({ ok: true, selectionId: selection.id, published: publish });
}
