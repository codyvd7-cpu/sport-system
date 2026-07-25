import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getActiveAlert } from '@/lib/alertsService';

// ─── /api/coach/pulse ─────────────────────────────────────────────────────────
// GET ?team=<team> (staff) → the live team picture for the coach dashboard:
//   - who has checked in at the gym TODAY (self-reported QR)
//   - this week's workout-log activity (distinct training days per athlete)
//   - whether an urgent alert is currently active
// One call, so the dashboard needs one fetch for its whole intelligence strip.

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const team = (req.nextUrl.searchParams.get('team') || '').trim();
  if (!team) return NextResponse.json({ error: 'Team required.' }, { status: 400 });

  const db = getAdmin();
  const { data: athletes } = await db.from('athletes').select('id,full_name').eq('team', team);
  const ids = (athletes || []).map(a => a.id);
  const nameById = new Map((athletes || []).map(a => [a.id, a.full_name as string]));

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });

  // Monday of this week (Africa/Johannesburg)
  const jhbNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
  const dow = jhbNow.getDay();
  jhbNow.setDate(jhbNow.getDate() - (dow === 0 ? 6 : dow - 1));
  const weekStart = jhbNow.toLocaleDateString('en-CA');

  const [checkinsRes, workoutRes, alert] = await Promise.all([
    ids.length
      ? db.from('gym_checkins').select('athlete_id,venue,checkin_time').in('athlete_id', ids).eq('checkin_date', today).order('checkin_time', { ascending: true })
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? db.from('workout_logs').select('athlete_id,logged_date').in('athlete_id', ids).gte('logged_date', weekStart)
      : Promise.resolve({ data: [] as any[] }),
    getActiveAlert(db),
  ]);

  const checkinsToday = (checkinsRes.data || []).map((c: any) => ({
    name: nameById.get(c.athlete_id) || 'Athlete',
    venue: c.venue,
    time: String(c.checkin_time || '').slice(0, 5),
  }));

  const daysByAthlete = new Map<string, Set<string>>();
  for (const r of workoutRes.data || []) {
    if (!daysByAthlete.has(r.athlete_id)) daysByAthlete.set(r.athlete_id, new Set());
    daysByAthlete.get(r.athlete_id)!.add(String(r.logged_date));
  }
  const workoutWeek = [...daysByAthlete.entries()]
    .map(([id, days]) => ({ name: nameById.get(id) || 'Athlete', days: days.size }))
    .sort((a, b) => b.days - a.days);

  return NextResponse.json({
    checkinsToday,
    workoutWeek,
    workoutAthletes: workoutWeek.length,
    alert: alert ? { type: alert.type, message: alert.message } : null,
  });
}
