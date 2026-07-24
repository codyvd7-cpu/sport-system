import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { verifyPlayer, requireAthleteId } from '@/lib/playerAuth';

// ─── /api/workout/me ──────────────────────────────────────────────────────────
// GET → the signed-in player's streak, recent log entries, and their personal
// best (heaviest logged weight) per exercise they've logged.

function computeStreak(dates: string[]): number {
  const set = new Set(dates);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
  const cursor = new Date(today + 'T00:00:00');
  let streak = 0;
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const key = cursor.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
    if (!set.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  const db = getAdmin();

  const player = await verifyPlayer(req);
  if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const athleteId = await requireAthleteId(player.userId);
  if (!athleteId) return NextResponse.json({ streak: 0, recent: [], personalBests: [] });

  const { data: logs } = await db.from('workout_logs')
    .select('id,program_exercise_id,sets,reps,weight_kg,logged_date,created_at')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: false })
    .limit(100);

  const rows = logs || [];
  const streak = computeStreak([...new Set(rows.map(r => String(r.logged_date)))]);

  const exerciseIds = [...new Set(rows.map(r => r.program_exercise_id))];
  const { data: exercises } = exerciseIds.length
    ? await db.from('workout_program_exercises').select('id,name').in('id', exerciseIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((exercises || []).map(e => [e.id, e.name]));

  const bestByExercise = new Map<string, number>();
  for (const r of rows) {
    if (r.weight_kg == null) continue;
    const cur = bestByExercise.get(r.program_exercise_id) ?? -Infinity;
    if (Number(r.weight_kg) > cur) bestByExercise.set(r.program_exercise_id, Number(r.weight_kg));
  }

  return NextResponse.json({
    streak,
    recent: rows.slice(0, 10).map(r => ({
      ...r,
      exerciseName: nameById.get(r.program_exercise_id) || 'Exercise',
    })),
    personalBests: [...bestByExercise.entries()].map(([id, weightKg]) => ({
      exerciseName: nameById.get(id) || 'Exercise',
      weightKg,
    })),
  });
}
