import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { verifyPlayer, requireAthleteId } from '@/lib/playerAuth';

// ─── /api/workout/programs ───────────────────────────────────────────────────
// GET → active workout programs (with their exercises) visible to the signed-in
// player, matched by AGE CATEGORY (junior/senior) rather than exact squad name
// — squad-name matching failed in practice (a program set to "Opens" never
// matched an athlete on "3rds"). Coaches think in age categories for training.

// Junior = U14. Senior/Opens = everything "16 and up" (U16, U18, U19, U21,
// Senior). Adjust here if this split needs to change later.
function ageCategoryFor(ageGroup: string | null | undefined): 'junior' | 'senior' | null {
  const g = (ageGroup || '').trim().toUpperCase();
  if (!g) return null;
  if (g === 'U14') return 'junior';
  return 'senior';
}

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  const db = getAdmin();

  const player = await verifyPlayer(req);
  if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const athleteId = await requireAthleteId(player.userId);
  let athleteAgeGroup: string | null = null;
  if (athleteId) {
    const { data: ath } = await db.from('athletes').select('age_group').eq('id', athleteId).maybeSingle();
    athleteAgeGroup = ath?.age_group || null;
  }
  const category = ageCategoryFor(athleteAgeGroup);

  const { data: programs, error: progErr } = await db.from('workout_programs')
    .select('id,title,age_category,sport,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (progErr) return NextResponse.json({ error: progErr.message }, { status: 500 });

  const visible = (programs || []).filter(p => !p.age_category || p.age_category === category);

  const diagnostic = visible.length === 0 ? {
    athleteLinked: !!athleteId,
    athleteAgeGroup,
    athleteCategory: category,
    totalActivePrograms: (programs || []).length,
    programCategories: (programs || []).map(p => p.age_category),
  } : undefined;

  const ids = visible.map(p => p.id);
  if (ids.length === 0) return NextResponse.json({ programs: [], diagnostic });

  const { data: exercises, error: exErr } = await db.from('workout_program_exercises')
    .select('id,program_id,name,target_sets,target_reps,sort_order')
    .in('program_id', ids)
    .order('sort_order', { ascending: true });
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  const result = visible.map(p => ({
    ...p,
    exercises: (exercises || []).filter(e => e.program_id === p.id),
  }));
  return NextResponse.json({ programs: result });
}
