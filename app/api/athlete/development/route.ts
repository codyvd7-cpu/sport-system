import { NextRequest, NextResponse } from 'next/server';
import { authorize, requireOwnedAthlete } from '@/lib/staffAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { recordAthleteEvent } from '@/lib/athleteEvents';

// ─── /api/athlete/development ─────────────────────────────────────────────────
// Individual Development Plans — the closed loop:
//   TEST → GOAL → INTERVENTION → RETEST → OUTCOME
//
// Goals link to a real test key and carry baseline/target/latest values, so
// "did this work?" is answered by measurement rather than assertion. That is
// deliberately different from a free-text goal list, which is easy to build
// and impossible to evaluate.
//
// GET    ?athleteId=            → plans with their goals
// POST   { athleteId, title }   → create a plan
// POST   { planId, goal, ... }  → add a goal to a plan
// PATCH  { goalId, ... }        → update progress or close a goal

export async function GET(req: NextRequest) {
  const ctx = await authorize(req, 'athlete.view');
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const athleteId = req.nextUrl.searchParams.get('athleteId') || '';
  if (!athleteId) return NextResponse.json({ error: 'athleteId required.' }, { status: 400 });

  // Same-school AND, for a team-assigned coach, same-team (B2).
  if (!(await requireOwnedAthlete(ctx, athleteId))) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const db = getAdmin();
  const { data: plans } = await db.from('development_plans')
    .select('id,title,period,status,created_at,created_by,reviewed_at')
    .eq('athlete_id', athleteId).order('created_at', { ascending: false });

  const planIds = (plans || []).map(p => p.id);
  const { data: goals } = planIds.length
    ? await db.from('development_goals')
        .select('id,plan_id,category,goal,test_key,baseline_value,target_value,latest_value,unit,intervention,review_date,status,outcome_note,created_at,achieved_at')
        .in('plan_id', planIds).order('created_at', { ascending: true })
    : { data: [] };

  return NextResponse.json({
    plans: (plans || []).map(p => ({ ...p, goals: (goals || []).filter(g => g.plan_id === p.id) })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await authorize(req, 'athlete.manage');
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const schoolId = ctx.schoolId;
  const db = getAdmin();

  // ── Add a goal to an existing plan ────────────────────────────────────────
  if (body.planId) {
    const { data: plan } = await db.from('development_plans')
      .select('id,athlete_id,school_id').eq('id', String(body.planId)).maybeSingle();
    if (!plan || plan.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    // The plan's athlete must be one this coach may act on (B2).
    if (!(await requireOwnedAthlete(ctx, plan.athlete_id))) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const goal = String(body.goal || '').trim();
    if (!goal) return NextResponse.json({ error: 'goal is required.' }, { status: 400 });

    const { data, error } = await db.from('development_goals').insert([{
      plan_id: plan.id,
      athlete_id: plan.athlete_id,
      school_id: schoolId,
      category: String(body.category || 'physical'),
      goal,
      test_key: body.testKey ? String(body.testKey) : null,
      baseline_value: body.baselineValue != null && body.baselineValue !== '' ? Number(body.baselineValue) : null,
      target_value: body.targetValue != null && body.targetValue !== '' ? Number(body.targetValue) : null,
      unit: body.unit ? String(body.unit) : null,
      intervention: body.intervention ? String(body.intervention) : null,
      review_date: body.reviewDate || null,
      created_by: ctx.email || 'staff',
    }]).select('id,goal').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    void recordAthleteEvent({
      athleteId: plan.athlete_id, schoolId, type: 'goal_set',
      summary: `Goal set — ${goal}`,
      detail: { category: body.category, testKey: body.testKey, target: body.targetValue },
      sourceTable: 'development_goals', sourceId: data.id, actor: ctx.email || 'staff',
    });

    return NextResponse.json({ ok: true, goal: data });
  }

  // ── Create a plan ─────────────────────────────────────────────────────────
  const athleteId = String(body.athleteId || '');
  const title = String(body.title || '').trim();
  if (!athleteId || !title) return NextResponse.json({ error: 'athleteId and title are required.' }, { status: 400 });
  if (!(await requireOwnedAthlete(ctx, athleteId))) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data, error } = await db.from('development_plans').insert([{
    athlete_id: athleteId,
    school_id: schoolId,
    title,
    period: body.period ? String(body.period) : null,
    created_by: ctx.email || 'staff',
  }]).select('id,title,period,status,created_at').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plan: { ...data, goals: [] } });
}

export async function PATCH(req: NextRequest) {
  const ctx = await authorize(req, 'athlete.manage');
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const goalId = String(body.goalId || '');
  if (!goalId) return NextResponse.json({ error: 'goalId required.' }, { status: 400 });

  const schoolId = ctx.schoolId;
  const db = getAdmin();
  const { data: existing } = await db.from('development_goals')
    .select('id,athlete_id,school_id,goal,status,target_value,unit').eq('id', goalId).maybeSingle();
  if (!existing || existing.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!(await requireOwnedAthlete(ctx, existing.athlete_id))) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (body.latestValue != null && body.latestValue !== '') patch.latest_value = Number(body.latestValue);
  if (body.intervention != null) patch.intervention = String(body.intervention);
  if (body.reviewDate != null) patch.review_date = body.reviewDate || null;
  if (body.outcomeNote != null) patch.outcome_note = String(body.outcomeNote);
  if (body.status) {
    patch.status = String(body.status);
    if (body.status === 'achieved') patch.achieved_at = new Date().toISOString();
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const { error } = await db.from('development_goals').update(patch).eq('id', goalId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Closing a goal is a genuine milestone in the athlete's history
  if (body.status === 'achieved' && existing.status !== 'achieved') {
    void recordAthleteEvent({
      athleteId: existing.athlete_id, schoolId, type: 'goal_achieved',
      summary: `Goal achieved — ${existing.goal}`,
      detail: { target: existing.target_value, achieved: patch.latest_value, unit: existing.unit },
      sourceTable: 'development_goals', sourceId: goalId, actor: ctx.email || 'staff',
    });
  }

  return NextResponse.json({ ok: true });
}
