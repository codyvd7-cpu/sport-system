import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { verifyPlayer, requireAthleteContext } from '@/lib/playerAuth';

// ─── /api/athlete/health ──────────────────────────────────────────────────────
// Ingests training sessions the native app pulled from Apple Health / Google
// Health Connect. The athlete is resolved SERVER-SIDE from the signed-in user —
// the client never says whose data this is, so a player can only ever write to
// their own record. Upserts on (athlete_id, source, start_time) so re-syncing
// the same window is idempotent and never duplicates a session.

const SOURCES = new Set(['apple_health', 'health_connect']);
const num = (v: any): number | null => (Number.isFinite(Number(v)) ? Number(v) : null);
const int = (v: any): number | null => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

export async function POST(req: NextRequest) {
  const rl = await rateLimit(`health-ingest:${getClientId(req)}`, { max: 12, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const user = await verifyPlayer(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await requireAthleteContext(user.userId);
  if (!ctx) return NextResponse.json({ error: 'No linked athlete. Finish your profile first.' }, { status: 400 });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch {}
  const source = String(body.source || '');
  const activities: any[] = Array.isArray(body.activities) ? body.activities : [];
  if (!SOURCES.has(source)) return NextResponse.json({ error: 'Unknown source.' }, { status: 400 });
  if (!activities.length) return NextResponse.json({ ok: true, imported: 0 });

  // Cap a single sync so one request can't dump an unbounded payload.
  const rows = activities.slice(0, 500).map(a => {
    // heart rate may arrive as an array of samples ({ bpm } or numbers) or as
    // precomputed avg/max — derive both ways.
    let avg = int(a.avgHr ?? a.averageHeartRate);
    let max = int(a.maxHr ?? a.maxHeartRate);
    if ((avg === null || max === null) && Array.isArray(a.heartRate) && a.heartRate.length) {
      const bpm = a.heartRate.map((h: any) => Number(h?.bpm ?? h)).filter((n: number) => Number.isFinite(n));
      if (bpm.length) {
        if (avg === null) avg = Math.round(bpm.reduce((s: number, n: number) => s + n, 0) / bpm.length);
        if (max === null) max = Math.round(Math.max(...bpm));
      }
    }
    const start = a.startDate || a.startTime || a.start;
    const end = a.endDate || a.endTime || a.end || null;
    const duration = int(a.duration) ?? (start && end ? Math.round((+new Date(end) - +new Date(start)) / 1000) : null);
    return {
      athlete_id: ctx.athleteId,
      school_id: ctx.schoolId,
      source,
      workout_type: a.workoutType ? String(a.workoutType).slice(0, 60) : null,
      start_time: start ? new Date(start).toISOString() : null,
      end_time: end ? new Date(end).toISOString() : null,
      duration_s: duration,
      distance_m: num(a.distance ?? a.distanceMeters),
      calories: num(a.calories),
      avg_hr: avg,
      max_hr: max,
      raw: a && typeof a === 'object' ? a : null,
    };
  }).filter(r => r.start_time); // a session with no start time is unusable

  if (!rows.length) return NextResponse.json({ ok: true, imported: 0 });

  const { error } = await getAdmin()
    .from('wearable_activities')
    .upsert(rows, { onConflict: 'athlete_id,source,start_time' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, imported: rows.length });
}
