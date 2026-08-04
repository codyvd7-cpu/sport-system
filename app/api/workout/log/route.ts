import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { verifyPlayer, requireAthleteContext } from '@/lib/playerAuth';
import { rateLimit, getClientId } from '@/lib/rateLimit';

// ─── /api/workout/log ─────────────────────────────────────────────────────────
// POST { program_exercise_id, sets, reps, weight_kg? } → records the log entry,
// flags whether it's a new personal best on that exercise, returns the
// player's current day-streak.

function computeStreak(dates: string[]): number {
  // dates: distinct logged_date strings (YYYY-MM-DD), any order.
  const set = new Set(dates);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
  const cursor = new Date(today + 'T00:00:00');
  let streak = 0;
  // A streak counts today if already logged; otherwise it can still be "alive"
  // through yesterday (so logging tomorrow keeps it going) but starts at 0
  // once a day is missed.
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = cursor.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
    if (!set.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function POST(req: NextRequest) {
  const ip = getClientId(req);
  const rl = await rateLimit(`workout-log:${ip}`, { max: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Slow down — try again in a minute.' }, { status: 429 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const db = getAdmin();
  const player = await verifyPlayer(req);
  if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await requireAthleteContext(player.userId);
  if (!ctx) return NextResponse.json({ error: 'Link your athlete record first.' }, { status: 400 });
  const athleteId = ctx.athleteId;

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch {}
  const programExerciseId = String(body.program_exercise_id || '');
  const sets = Number(body.sets);
  const reps = Number(body.reps);
  const weightKg = body.weight_kg != null && body.weight_kg !== '' ? Number(body.weight_kg) : null;

  if (!programExerciseId || !Number.isFinite(sets) || sets <= 0 || !Number.isFinite(reps) || reps <= 0) {
    return NextResponse.json({ error: 'Sets and reps are required.' }, { status: 400 });
  }
  if (weightKg != null && (!Number.isFinite(weightKg) || weightKg < 0)) {
    return NextResponse.json({ error: 'Invalid weight.' }, { status: 400 });
  }

  // Previous best on this exact exercise, to detect a new PB
  let isNewPb = false;
  if (weightKg != null) {
    const { data: prior } = await db.from('workout_logs')
      .select('weight_kg')
      .eq('athlete_id', athleteId).eq('program_exercise_id', programExerciseId)
      .order('weight_kg', { ascending: false }).limit(1).maybeSingle();
    isNewPb = !prior || weightKg > Number(prior.weight_kg || 0);
  }

  const { error: insErr } = await db.from('workout_logs')
    .insert([{ athlete_id: athleteId, program_exercise_id: programExerciseId, sets, reps, weight_kg: weightKg, school_id: ctx.schoolId }]);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const { data: dateRows } = await db.from('workout_logs')
    .select('logged_date').eq('athlete_id', athleteId).order('logged_date', { ascending: false }).limit(60);
  const streak = computeStreak((dateRows || []).map(r => String(r.logged_date)));

  return NextResponse.json({ ok: true, isNewPb, streak });
}
