import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { recordAthleteEvents, type AthleteEventType } from '@/lib/athleteEvents';

// ─── /api/athlete/events/bulk ─────────────────────────────────────────────────
// Records many athlete events in one call — used when saving a register, where
// a per-athlete round trip would be wasteful.
//
// Callers should send only events worth keeping. Marking a full squad present
// every session would bury the genuinely notable moments in an athlete's
// timeline, so the attendance screens deliberately record absences only.

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const events = Array.isArray(body.events) ? body.events : [];
  if (events.length === 0) return NextResponse.json({ ok: true, recorded: 0 });
  if (events.length > 200) {
    return NextResponse.json({ error: 'Too many events in one request.' }, { status: 400 });
  }

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  // Only accept athletes that genuinely belong to the caller's school — the
  // client supplies these ids, so they can't be trusted on their own.
  const ids = [...new Set(events.map((e: Record<string, unknown>) => String(e.athleteId || '')).filter(Boolean))];
  const { data: valid } = await getAdmin()
    .from('athletes').select('id').eq('school_id', schoolId).in('id', ids);
  const allowed = new Set((valid || []).map(a => a.id));

  const toRecord = events
    .filter((e: Record<string, unknown>) => allowed.has(String(e.athleteId)) && e.type && e.summary)
    .map((e: Record<string, unknown>) => ({
      athleteId: String(e.athleteId),
      schoolId,
      type: String(e.type) as AthleteEventType,
      summary: String(e.summary),
      detail: (typeof e.detail === 'object' && e.detail ? e.detail : {}) as Record<string, unknown>,
      sourceTable: e.sourceTable ? String(e.sourceTable) : undefined,
      actor: auth.email || 'staff',
      occurredAt: e.occurredAt ? String(e.occurredAt) : undefined,
    }));

  await recordAthleteEvents(toRecord);
  return NextResponse.json({ ok: true, recorded: toRecord.length });
}
