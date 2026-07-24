import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { verifyPlayer, requireAthleteId } from '@/lib/playerAuth';

// ─── /api/workout/programs ───────────────────────────────────────────────────
// GET → active workout programs (with their exercises) visible to the signed-in
// player's team. Used by the Training tab to pick "what am I logging today".

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  const db = getAdmin();

  const player = await verifyPlayer(req);
  if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const athleteId = await requireAthleteId(player.userId);
  let team: string | null = null;
  if (athleteId) {
    const { data: ath } = await db.from('athletes').select('team').eq('id', athleteId).maybeSingle();
    team = ath?.team || null;
  }

  const { data: programs, error: progErr } = await db.from('workout_programs')
    .select('id,title,team,sport,sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (progErr) return NextResponse.json({ error: progErr.message }, { status: 500 });

  const visible = (programs || []).filter(p => !p.team || p.team === team);
  const ids = visible.map(p => p.id);
  if (ids.length === 0) return NextResponse.json({ programs: [] });

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
