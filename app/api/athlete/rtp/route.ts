import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { recordAthleteEvent } from '@/lib/athleteEvents';

// ─── /api/athlete/rtp ─────────────────────────────────────────────────────────
// Return-to-play protocol. Stages are defined per school (rtp_stages), so this
// coordinates whatever pathway a school actually runs rather than imposing one.
//
// Scope boundary: Altus records THAT medical clearance was given, by whom and
// when. It does not store diagnoses or treatment. Clinical decisions stay with
// qualified people; this makes sure the coach knows where the athlete stands.
//
// GET  ?athleteId=   → open case, its history, the school's stages, baselines
// GET  ?open=1       → all open cases (the RTP worklist)
// POST { athleteId, injurySummary, ... }        → open a case
// PATCH { caseId, action: 'advance'|'fail'|'clear-medical'|'close', ... }

async function loadBaselines(db: ReturnType<typeof getAdmin>, athleteId: string) {
  // The athlete's own earliest recorded result per test this year — what
  // "sport-specific testing against baseline" is measured against. Their own
  // numbers, not a cohort average.
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const { data } = await db.from('performance_tests')
    .select('test_type,value,unit,test_date')
    .eq('athlete_id', athleteId).gte('test_date', yearStart)
    .order('test_date', { ascending: true });

  const baseline = new Map<string, { value: number; unit: string; date: string }>();
  const latest = new Map<string, { value: number; unit: string; date: string }>();
  for (const r of data || []) {
    if (!baseline.has(r.test_type)) baseline.set(r.test_type, { value: r.value, unit: r.unit, date: r.test_date });
    latest.set(r.test_type, { value: r.value, unit: r.unit, date: r.test_date });
  }
  return [...baseline.entries()].map(([test, b]) => ({
    test, baseline: b.value, unit: b.unit, baselineDate: b.date,
    latest: latest.get(test)?.value ?? null, latestDate: latest.get(test)?.date ?? null,
  }));
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });
  const db = getAdmin();

  // Worklist: every open case in the school
  if (req.nextUrl.searchParams.get('open')) {
    const { data: cases } = await db.from('rtp_cases')
      .select('id,athlete_id,injury_summary,body_area,reported_on,expected_return,current_stage_id,medical_cleared_on')
      .eq('school_id', schoolId).eq('status', 'open').order('reported_on', { ascending: true });

    const ids = [...new Set((cases || []).map(c => c.athlete_id))];
    const stageIds = [...new Set((cases || []).map(c => c.current_stage_id).filter(Boolean))];
    const [{ data: athletes }, { data: stages }] = await Promise.all([
      ids.length ? db.from('athletes').select('id,full_name,team').in('id', ids) : Promise.resolve({ data: [] }),
      stageIds.length ? db.from('rtp_stages').select('id,name,stage_order').in('id', stageIds as string[]) : Promise.resolve({ data: [] }),
    ]);
    const aMap = new Map((athletes || []).map(a => [a.id, a]));
    const sMap = new Map((stages || []).map(s => [s.id, s]));

    return NextResponse.json({
      cases: (cases || []).map(c => ({
        id: c.id, athleteId: c.athlete_id,
        name: aMap.get(c.athlete_id)?.full_name ?? 'Athlete',
        team: aMap.get(c.athlete_id)?.team ?? null,
        injury: c.injury_summary, bodyArea: c.body_area,
        reportedOn: c.reported_on, expectedReturn: c.expected_return,
        stage: c.current_stage_id ? sMap.get(c.current_stage_id)?.name ?? null : null,
        stageOrder: c.current_stage_id ? sMap.get(c.current_stage_id)?.stage_order ?? null : null,
        medicallyCleared: !!c.medical_cleared_on,
        daysOut: Math.floor((Date.now() - new Date(c.reported_on).getTime()) / 86400000),
      })),
    });
  }

  const athleteId = req.nextUrl.searchParams.get('athleteId') || '';
  if (!athleteId) return NextResponse.json({ error: 'athleteId or open=1 required.' }, { status: 400 });

  const { data: ath } = await db.from('athletes').select('school_id,sport').eq('id', athleteId).maybeSingle();
  if (!ath || ath.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const [{ data: stages }, { data: cases }, baselines] = await Promise.all([
    db.from('rtp_stages')
      .select('id,stage_order,name,description,owner_role,requires_medical_clearance,requires_baseline_tests,sets_availability')
      .eq('school_id', schoolId).eq('is_active', true).order('stage_order'),
    db.from('rtp_cases')
      .select('id,injury_summary,body_area,occurred_on,reported_on,current_stage_id,status,medical_cleared_on,medical_cleared_by,medical_clearance_note,expected_return,cleared_on')
      .eq('athlete_id', athleteId).order('created_at', { ascending: false }).limit(10),
    loadBaselines(db, athleteId),
  ]);

  const openCase = (cases || []).find(c => c.status === 'open') || null;
  const { data: progress } = openCase
    ? await db.from('rtp_case_progress').select('stage_name,outcome,note,recorded_by,created_at')
        .eq('case_id', openCase.id).order('created_at', { ascending: true })
    : { data: [] };

  return NextResponse.json({
    stages: stages || [],
    openCase,
    progress: progress || [],
    pastCases: (cases || []).filter(c => c.status !== 'open'),
    baselines,
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const athleteId = String(body.athleteId || '');
  const injurySummary = String(body.injurySummary || '').trim();
  if (!athleteId || !injurySummary) {
    return NextResponse.json({ error: 'athleteId and injurySummary are required.' }, { status: 400 });
  }

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();
  const { data: ath } = await db.from('athletes').select('school_id,availability').eq('id', athleteId).maybeSingle();
  if (!ath || ath.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // One open case at a time — reopening rather than stacking keeps the history readable
  const { data: existing } = await db.from('rtp_cases')
    .select('id').eq('athlete_id', athleteId).eq('status', 'open').maybeSingle();
  if (existing) return NextResponse.json({ error: 'This athlete already has an open case.' }, { status: 409 });

  const { data: firstStage } = await db.from('rtp_stages')
    .select('id,name,sets_availability').eq('school_id', schoolId).eq('is_active', true)
    .order('stage_order').limit(1).maybeSingle();

  const { data: created, error } = await db.from('rtp_cases').insert([{
    school_id: schoolId, athlete_id: athleteId,
    injury_summary: injurySummary,
    body_area: body.bodyArea ? String(body.bodyArea) : null,
    occurred_on: body.occurredOn || null,
    expected_return: body.expectedReturn || null,
    current_stage_id: firstStage?.id ?? null,
    opened_by: auth.email || 'staff',
  }]).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (firstStage) {
    await db.from('rtp_case_progress').insert([{
      school_id: schoolId, case_id: created.id, stage_id: firstStage.id,
      stage_name: firstStage.name, outcome: 'entered', recorded_by: auth.email || 'staff',
    }]);
    if (firstStage.sets_availability) {
      await db.from('athletes').update({ availability: firstStage.sets_availability }).eq('id', athleteId);
    }
  }

  void recordAthleteEvent({
    athleteId, schoolId, type: 'injury_reported',
    summary: `Injury reported — ${injurySummary}`,
    detail: { bodyArea: body.bodyArea ?? null, expectedReturn: body.expectedReturn ?? null },
    sourceTable: 'rtp_cases', sourceId: created.id, actor: auth.email || 'staff',
  });

  return NextResponse.json({ ok: true, caseId: created.id });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const caseId = String(body.caseId || '');
  const action = String(body.action || '');
  if (!caseId || !action) return NextResponse.json({ error: 'caseId and action are required.' }, { status: 400 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();
  const { data: c } = await db.from('rtp_cases')
    .select('id,school_id,athlete_id,current_stage_id,medical_cleared_on,injury_summary').eq('id', caseId).maybeSingle();
  if (!c || c.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data: stages } = await db.from('rtp_stages')
    .select('id,stage_order,name,requires_medical_clearance,sets_availability')
    .eq('school_id', schoolId).eq('is_active', true).order('stage_order');
  const ordered = stages || [];
  const currentIdx = ordered.findIndex(s => s.id === c.current_stage_id);

  // ── Record medical clearance (who and when only) ──────────────────────────
  if (action === 'clear-medical') {
    await db.from('rtp_cases').update({
      medical_cleared_on: body.clearedOn || new Date().toISOString().slice(0, 10),
      medical_cleared_by: body.clearedBy ? String(body.clearedBy) : null,
      medical_clearance_note: body.note ? String(body.note) : null,
    }).eq('id', caseId);
    return NextResponse.json({ ok: true });
  }

  // ── Advance to the next stage ─────────────────────────────────────────────
  if (action === 'advance') {
    const next = ordered[currentIdx + 1];
    if (!next) return NextResponse.json({ error: 'Already at the final stage.' }, { status: 400 });

    // Gate: a stage requiring medical clearance can't be entered without it.
    // This is the protocol being enforced rather than merely described.
    if (next.requires_medical_clearance && !c.medical_cleared_on) {
      return NextResponse.json({
        error: `"${next.name}" requires medical clearance to be recorded first.`,
      }, { status: 409 });
    }

    await db.from('rtp_cases').update({ current_stage_id: next.id }).eq('id', caseId);
    await db.from('rtp_case_progress').insert([
      { school_id: schoolId, case_id: caseId, stage_id: c.current_stage_id, stage_name: ordered[currentIdx]?.name ?? 'Stage', outcome: 'passed', note: body.note ? String(body.note) : null, test_results: body.testResults ?? {}, recorded_by: auth.email || 'staff' },
      { school_id: schoolId, case_id: caseId, stage_id: next.id, stage_name: next.name, outcome: 'entered', recorded_by: auth.email || 'staff' },
    ]);
    if (next.sets_availability) {
      await db.from('athletes').update({ availability: next.sets_availability }).eq('id', c.athlete_id);
    }

    // Reaching the final stage closes the case
    const isFinal = currentIdx + 1 === ordered.length - 1;
    if (isFinal) {
      await db.from('rtp_cases').update({ status: 'cleared', cleared_on: new Date().toISOString().slice(0, 10) }).eq('id', caseId);
      void recordAthleteEvent({
        athleteId: c.athlete_id, schoolId, type: 'injury_cleared',
        summary: `Returned to full participation — ${c.injury_summary}`,
        sourceTable: 'rtp_cases', sourceId: caseId, actor: auth.email || 'staff',
      });
    }
    return NextResponse.json({ ok: true, stage: next.name, closed: isFinal });
  }

  // ── Fail a stage: stays put, but the attempt is recorded ──────────────────
  if (action === 'fail') {
    await db.from('rtp_case_progress').insert([{
      school_id: schoolId, case_id: caseId, stage_id: c.current_stage_id,
      stage_name: ordered[currentIdx]?.name ?? 'Stage', outcome: 'failed',
      note: body.note ? String(body.note) : null, test_results: body.testResults ?? {},
      recorded_by: auth.email || 'staff',
    }]);
    return NextResponse.json({ ok: true });
  }

  if (action === 'close') {
    await db.from('rtp_cases').update({ status: 'abandoned' }).eq('id', caseId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
