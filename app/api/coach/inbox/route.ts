import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getActiveAlert } from '@/lib/alertsService';

// ─── /api/coach/inbox ─────────────────────────────────────────────────────────
// The data behind "understand today in 20 seconds".
//
// Three sections, deliberately in priority order:
//   TODAY            — what's happening now
//   NEEDS ATTENTION  — what a coach should act on, each with its REASON
//   RECENT           — what changed, including the good news
//
// Design rules taken from the product philosophy:
//   • Every flag states its evidence. No opaque scores, no "risk: 76%".
//   • Attention items are capped, so this stays a calm priority list rather
//     than an endless notification feed.
//   • Everything is derived from data the app already records — nothing here
//     invents a metric or claims more certainty than the data supports.

const ATTENTION_CAP = 8;
const RECENT_CAP = 12;

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const db = getAdmin();
  const team = req.nextUrl.searchParams.get('team');           // optional: scope to one team
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const fortnightAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

  // ── Athletes in scope ──────────────────────────────────────────────────────
  let athQ = db.from('athletes')
    .select('id,full_name,team,availability,position')
    .eq('school_id', schoolId).eq('is_active', true);
  if (team) athQ = athQ.eq('team', team);
  const { data: athletes } = await athQ;
  const roster = athletes || [];
  const ids = roster.map(a => a.id);
  const nameById = new Map(roster.map(a => [a.id, a.full_name as string]));

  if (ids.length === 0) {
    return NextResponse.json({ today: {}, attention: [], recent: [], counts: {} });
  }

  const [fixturesRes, attendanceRes, eventsRes, alert, rtpRes] = await Promise.all([
    db.from('portal_fixtures')
      .select('team,opponent,fixture_time,venue,home_away,sport')
      .eq('school_id', schoolId).eq('fixture_date', today).order('fixture_time'),
    db.from('attendance')
      .select('athlete_id,status,session_date')
      .in('athlete_id', ids).gte('session_date', fortnightAgo),
    db.from('athlete_events')
      .select('id,athlete_id,event_type,summary,occurred_at')
      .eq('school_id', schoolId).gte('occurred_at', weekAgo)
      .order('occurred_at', { ascending: false }).limit(60),
    getActiveAlert(db, schoolId),
    db.from('rtp_cases')
      .select('id,athlete_id,injury_summary,reported_on,expected_return,current_stage_id,medical_cleared_on')
      .eq('school_id', schoolId).eq('status', 'open'),
  ]);

  // Resolve stage names for any open injury cases
  const stageIds = [...new Set((rtpRes.data || []).map(c => c.current_stage_id).filter(Boolean))];
  const { data: rtpStages } = stageIds.length
    ? await db.from('rtp_stages').select('id,name,stage_order,requires_medical_clearance').in('id', stageIds as string[])
    : { data: [] };
  const stageMap = new Map((rtpStages || []).map(s => [s.id, s]));

  // ── TODAY ──────────────────────────────────────────────────────────────────
  const unavailable = roster.filter(a => a.availability && a.availability !== 'Available');

  // ── NEEDS ATTENTION ────────────────────────────────────────────────────────
  // Attendance: recent absence rate, over a meaningful sample only. A coach
  // doesn't need flagging because someone missed their first ever session.
  const byAthlete = new Map<string, { total: number; missed: number }>();
  for (const r of attendanceRes.data || []) {
    const rec = byAthlete.get(r.athlete_id) || { total: 0, missed: 0 };
    rec.total++;
    if (r.status && r.status !== 'Present') rec.missed++;
    byAthlete.set(r.athlete_id, rec);
  }

  const attention: { athleteId: string; name: string; reason: string; kind: string; detail?: string }[] = [];

  for (const [athleteId, rec] of byAthlete) {
    if (rec.total >= 3 && rec.missed >= 2) {
      attention.push({
        athleteId,
        name: nameById.get(athleteId) || 'Athlete',
        kind: 'attendance',
        reason: `Missed ${rec.missed} of last ${rec.total} sessions`,
        detail: 'Last 14 days',
      });
    }
  }

  // Open injury cases: the most actionable thing on a coach's list. Shows the
  // protocol stage so they know what's actually needed next, not just "injured".
  const rtpAthleteIds = new Set<string>();
  for (const c of rtpRes.data || []) {
    if (!ids.includes(c.athlete_id)) continue;
    rtpAthleteIds.add(c.athlete_id);
    const stage = c.current_stage_id ? stageMap.get(c.current_stage_id) : null;
    const days = Math.floor((Date.now() - new Date(c.reported_on).getTime()) / 86400000);
    const waitingOnMedical = !!stage?.requires_medical_clearance && !c.medical_cleared_on;
    attention.push({
      athleteId: c.athlete_id,
      name: nameById.get(c.athlete_id) || 'Athlete',
      kind: 'rtp',
      reason: stage ? `${stage.name}${waitingOnMedical ? ' — awaiting medical clearance' : ''}` : c.injury_summary,
      detail: `${c.injury_summary} · day ${days}`,
    });
  }

  // Availability: anyone not fully available and NOT already covered by an
  // open injury case above (avoids listing the same athlete twice)
  for (const a of unavailable) {
    if (rtpAthleteIds.has(a.id)) continue;
    attention.push({
      athleteId: a.id,
      name: a.full_name,
      kind: 'availability',
      reason: `Currently ${a.availability}`,
      detail: a.team,
    });
  }

  // Sort: attendance concerns first (more actionable), then alphabetical
  const KIND_PRIORITY: Record<string, number> = { rtp: 0, attendance: 1, availability: 2 };
  attention.sort((x, y) => {
    const px = KIND_PRIORITY[x.kind] ?? 9, py = KIND_PRIORITY[y.kind] ?? 9;
    return px === py ? x.name.localeCompare(y.name) : px - py;
  });

  // ── RECENT (includes the good news) ────────────────────────────────────────
  const POSITIVE = new Set(['personal_best', 'goal_achieved', 'award', 'injury_cleared']);
  const recent = (eventsRes.data || [])
    .filter(e => ids.includes(e.athlete_id))
    .slice(0, RECENT_CAP)
    .map(e => ({
      id: e.id,
      athleteId: e.athlete_id,
      name: nameById.get(e.athlete_id) || 'Athlete',
      type: e.event_type,
      summary: e.summary,
      occurredAt: e.occurred_at,
      positive: POSITIVE.has(e.event_type),
    }));

  return NextResponse.json({
    today: {
      date: today,
      fixtures: fixturesRes.data || [],
      unavailableCount: unavailable.length,
      squadSize: roster.length,
      alert: alert ? { type: alert.type, message: alert.message } : null,
    },
    attention: attention.slice(0, ATTENTION_CAP),
    attentionTotal: attention.length,
    recent,
    counts: {
      newPBs: recent.filter(r => r.type === 'personal_best').length,
      attendanceConcerns: attention.filter(a => a.kind === 'attendance').length,
      unavailable: unavailable.length,
      openInjuries: (rtpRes.data || []).filter(c => ids.includes(c.athlete_id)).length,
    },
  });
}
