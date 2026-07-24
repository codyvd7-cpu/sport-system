import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { verifyPlayer, requireAthleteId } from '@/lib/playerAuth';

// ─── /api/workout/team ────────────────────────────────────────────────────────
// GET → this week's team activity: who's logged a session each day (a simple
// count-based leaderboard, not weight comparisons — keeps this about showing
// up, not who lifts the most, intentionally light-touch).

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  const db = getAdmin();

  const player = await verifyPlayer(req);
  if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const athleteId = await requireAthleteId(player.userId);
  if (!athleteId) return NextResponse.json({ leaderboard: [] });

  const { data: me } = await db.from('athletes').select('team').eq('id', athleteId).maybeSingle();
  const team = me?.team;
  if (!team) return NextResponse.json({ leaderboard: [] });

  const { data: teammates } = await db.from('athletes').select('id,full_name').eq('team', team);
  const ids = (teammates || []).map(t => t.id);
  if (ids.length === 0) return NextResponse.json({ leaderboard: [] });

  // Start of this week (Monday), Africa/Johannesburg
  const now = new Date();
  const jhbToday = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const dow = jhbToday.getDay(); // 0=Sun
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  jhbToday.setDate(jhbToday.getDate() - daysSinceMonday);
  const weekStart = jhbToday.toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });

  const { data: logs } = await db.from('workout_logs')
    .select('athlete_id,logged_date')
    .in('athlete_id', ids)
    .gte('logged_date', weekStart);

  const daysByAthlete = new Map<string, Set<string>>();
  for (const r of logs || []) {
    if (!daysByAthlete.has(r.athlete_id)) daysByAthlete.set(r.athlete_id, new Set());
    daysByAthlete.get(r.athlete_id)!.add(String(r.logged_date));
  }

  const leaderboard = (teammates || [])
    .map(t => ({ athleteId: t.id, name: t.full_name, sessionsThisWeek: daysByAthlete.get(t.id)?.size || 0 }))
    .filter(t => t.sessionsThisWeek > 0)
    .sort((a, b) => b.sessionsThisWeek - a.sessionsThisWeek)
    .slice(0, 15);

  return NextResponse.json({ leaderboard, weekStart });
}
