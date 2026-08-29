import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { recordAthleteEvent } from '@/lib/athleteEvents';

// ─── /api/athlete/speedtest ───────────────────────────────────────────────────
// Saves timed sprint attempts.
//
// A result arriving over Bluetooth is still just a client-supplied number, so
// it goes through exactly the same authorization as manual entry: the acting
// coach is resolved server-side, and the athlete must belong to their school.
// A connected SpeedGate must not become a way to write results onto athletes
// the user has no business touching.
//
// GET  ?athleteId=&testType=  → today's attempts + personal best
// POST { athleteId, testType, distanceM, elapsedMs, sessionId, hardwareRunId }
// PATCH { attemptId, status } → void an attempt (false trigger, stumble)

/** Sprint times: faster is better, so the PB is the minimum. */
function bestOf(rows: { elapsed_ms: number | null }[]): number | null {
  const valid = rows.map(r => r.elapsed_ms).filter((v): v is number => typeof v === 'number');
  return valid.length ? Math.min(...valid) : null;
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const athleteId = req.nextUrl.searchParams.get('athleteId') || '';
  const testType = req.nextUrl.searchParams.get('testType') || '';
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!athleteId) return NextResponse.json({ error: 'athleteId required.' }, { status: 400 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();
  const { data: ath } = await db.from('athletes').select('school_id').eq('id', athleteId).maybeSingle();
  if (!ath || ath.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  let q = db.from('speedtest_attempts')
    .select('id,attempt_no,elapsed_ms,status,distance_m,test_type,source,created_at,void_reason')
    .eq('athlete_id', athleteId).order('created_at', { ascending: true });
  if (testType) q = q.eq('test_type', testType);
  if (sessionId) q = q.eq('session_id', sessionId);
  const { data: attempts } = await q;

  // Historical best across all sessions, for the PB comparison on the result
  // screen. Only valid attempts count.
  let pbQuery = db.from('speedtest_attempts')
    .select('elapsed_ms').eq('athlete_id', athleteId).eq('status', 'valid');
  if (testType) pbQuery = pbQuery.eq('test_type', testType);
  const { data: allValid } = await pbQuery;

  return NextResponse.json({
    attempts: attempts || [],
    personalBest: bestOf(allValid || []),
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const athleteId = String(body.athleteId || '');
  const testType = String(body.testType || '').trim();
  const sessionId = String(body.sessionId || '');
  const distanceM = Number(body.distanceM);
  const status = String(body.status || 'valid');
  const elapsedMs = body.elapsedMs == null ? null : Number(body.elapsedMs);

  if (!athleteId || !testType || !sessionId) {
    return NextResponse.json({ error: 'athleteId, testType and sessionId are required.' }, { status: 400 });
  }
  if (!Number.isFinite(distanceM) || distanceM <= 0 || distanceM > 500) {
    return NextResponse.json({ error: 'Distance must be between 1 and 500 metres.' }, { status: 400 });
  }
  if (status === 'valid' && (!Number.isFinite(elapsedMs as number) || (elapsedMs as number) <= 0)) {
    return NextResponse.json({ error: 'A valid attempt needs a positive elapsed time.' }, { status: 400 });
  }

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();

  // Authorization: the athlete must belong to the acting coach's school. The
  // client supplies the id, so it is never trusted on its own.
  const { data: ath } = await db.from('athletes')
    .select('id,school_id,full_name').eq('id', athleteId).maybeSingle();
  if (!ath || ath.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // Attempt numbering is per athlete, per session, per test.
  const { count } = await db.from('speedtest_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId).eq('athlete_id', athleteId).eq('test_type', testType);

  const hardwareRunId = body.hardwareRunId == null ? null : Number(body.hardwareRunId);

  const { data: inserted, error } = await db.from('speedtest_attempts').insert([{
    school_id: schoolId,
    athlete_id: athleteId,
    session_id: sessionId,
    test_type: testType,
    distance_m: distanceM,
    attempt_no: (count ?? 0) + 1,
    elapsed_ms: status === 'valid' ? Math.round(elapsedMs as number) : null,
    status,
    source: body.source ? String(body.source) : 'speedgate',
    hardware_run_id: Number.isInteger(hardwareRunId) ? hardwareRunId : null,
    device_name: body.deviceName ? String(body.deviceName) : null,
    firmware_version: body.firmwareVersion ? String(body.firmwareVersion) : null,
    protocol_version: body.protocolVersion ?? null,
    recorded_by: auth.email || 'staff',
  }]).select('id,attempt_no,elapsed_ms,status').single();

  if (error) {
    // The unique index on (session_id, hardware_run_id) makes a duplicate
    // physically impossible. Report it as success rather than an error: the
    // result IS stored, and the coach should not see a scary failure because
    // the hardware retransmitted a notification.
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Promote the session best into performance_tests, so every existing PB,
  // trend and profile query keeps working with no changes. Upsert, because
  // that table intentionally holds one row per athlete/test/day.
  if (status === 'valid') {
    const { data: sessionRows } = await db.from('speedtest_attempts')
      .select('elapsed_ms').eq('athlete_id', athleteId)
      .eq('test_type', testType).eq('status', 'valid');
    const best = bestOf(sessionRows || []);

    if (best != null) {
      await db.from('performance_tests').upsert([{
        athlete_id: athleteId,
        school_id: schoolId,
        test_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' }),
        test_type: testType,
        value: best / 1000,            // seconds, for existing charts
        elapsed_ms: best,              // full precision preserved alongside
        unit: 's',
        distance_m: distanceM,
        source: 'speedgate',
      }], { onConflict: 'athlete_id,test_date,test_type' });
    }
  }

  void recordAthleteEvent({
    athleteId, schoolId, type: 'test_completed',
    summary: status === 'valid'
      ? `${testType}: ${((elapsedMs as number) / 1000).toFixed(3)}s`
      : `${testType}: ${status.toUpperCase()}`,
    detail: { distanceM, elapsedMs, status, source: 'speedgate' },
    sourceTable: 'speedtest_attempts', sourceId: inserted.id,
    actor: auth.email || 'staff',
  });

  return NextResponse.json({ ok: true, attempt: inserted });
}

export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const attemptId = String(body.attemptId || '');
  const status = String(body.status || '');
  if (!attemptId || !['valid', 'invalid', 'dns', 'dnf'].includes(status)) {
    return NextResponse.json({ error: 'attemptId and a valid status are required.' }, { status: 400 });
  }

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();
  const { data: row } = await db.from('speedtest_attempts')
    .select('id,school_id').eq('id', attemptId).maybeSingle();
  if (!row || row.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await db.from('speedtest_attempts').update({
    status,
    void_reason: body.reason ? String(body.reason) : null,
  }).eq('id', attemptId);

  return NextResponse.json({ ok: true });
}
