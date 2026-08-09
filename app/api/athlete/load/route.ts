import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/athlete/load ────────────────────────────────────────────────────────
// Session RPE. Two inputs (RPE 1-10 × duration in minutes) giving a standard
// internal load measure in arbitrary units.
//
// What this deliberately does NOT do: produce a readiness score, a risk
// percentage, or a training recommendation. Those require far more reliable
// longitudinal data than a school will have early on, and presenting them
// before that data exists would be inventing certainty. This stores the raw
// inputs and the well-understood RPE×duration product; a coach interprets it.
//
// GET  ?athleteId=  → recent sessions + weekly totals
// GET  ?team=       → today's squad-level load
// POST { athleteId, rpe, durationMin, sessionType?, sessionDate?, note? }

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const db = getAdmin();
  const athleteId = req.nextUrl.searchParams.get('athleteId');
  const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10);

  if (athleteId) {
    const { data: ath } = await db.from('athletes').select('school_id').eq('id', athleteId).maybeSingle();
    if (!ath || ath.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const { data } = await db.from('session_load')
      .select('id,session_date,session_type,rpe,duration_min,load_au,note')
      .eq('athlete_id', athleteId).gte('session_date', fourWeeksAgo)
      .order('session_date', { ascending: false });

    const rows = data || [];
    // Weekly totals, most recent week first. Plain sums — no acute:chronic
    // ratio, which needs more data than a school will have at this stage.
    const weekly = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.session_date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = monday.toISOString().slice(0, 10);
      weekly.set(key, (weekly.get(key) || 0) + (r.load_au || 0));
    }

    return NextResponse.json({
      sessions: rows,
      weekly: [...weekly.entries()].map(([weekStart, load]) => ({ weekStart, load }))
        .sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    });
  }

  return NextResponse.json({ error: 'athleteId required.' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const athleteId = String(body.athleteId || '');
  const rpe = Number(body.rpe);
  const durationMin = Number(body.durationMin);

  if (!athleteId || !Number.isFinite(rpe) || rpe < 1 || rpe > 10) {
    return NextResponse.json({ error: 'RPE must be between 1 and 10.' }, { status: 400 });
  }
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return NextResponse.json({ error: 'Duration must be a positive number of minutes.' }, { status: 400 });
  }

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();
  const { data: ath } = await db.from('athletes').select('school_id').eq('id', athleteId).maybeSingle();
  if (!ath || ath.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { error } = await db.from('session_load').upsert([{
    athlete_id: athleteId,
    school_id: schoolId,
    session_date: body.sessionDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' }),
    session_type: body.sessionType ? String(body.sessionType) : 'Training',
    rpe: Math.round(rpe),
    duration_min: Math.round(durationMin),
    note: body.note ? String(body.note) : null,
    recorded_by: auth.email || 'staff',
  }], { onConflict: 'athlete_id,session_date,session_type' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, loadAu: Math.round(rpe) * Math.round(durationMin) });
}
