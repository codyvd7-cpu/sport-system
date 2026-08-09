import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { recordAthleteEvent } from '@/lib/athleteEvents';

// ─── /api/athlete/status ──────────────────────────────────────────────────────
// Return to Play, built on the availability field coaches already use rather
// than as a parallel system. Changing status here does three things at once:
//   1. updates athletes.availability (what the rest of the app already reads)
//   2. appends to athlete_status_history (so the change has a record)
//   3. records an athlete event (so it appears on the timeline)
//
// Deliberately NOT clinical software: it captures the coach's own words for
// the reason and an expected return date. It does not diagnose, stage
// injuries, or clear anyone medically — qualified people do that, and this
// coordinates the information around their decision.
//
// GET  ?athleteId=  → status history
// GET  ?review=due  → athletes whose review date has arrived (RTP worklist)
// POST { athleteId, status, reason?, expectedReturn?, reviewDate? }

const VALID = ['Available', 'Modified', 'Injured', 'Resting'];

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });
  const db = getAdmin();

  // RTP worklist: who is due for review, and who is currently not fully available
  if (req.nextUrl.searchParams.get('review') === 'due') {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });

    const { data: unavailable } = await db.from('athletes')
      .select('id,full_name,team,availability')
      .eq('school_id', schoolId).eq('is_active', true).neq('availability', 'Available');

    const ids = (unavailable || []).map(a => a.id);
    const { data: latest } = ids.length
      ? await db.from('athlete_status_history')
          .select('athlete_id,status,reason,expected_return,review_date,created_at')
          .in('athlete_id', ids).order('created_at', { ascending: false })
      : { data: [] };

    // Most recent entry per athlete
    const seen = new Set<string>();
    const current = (latest || []).filter(r => !seen.has(r.athlete_id) && seen.add(r.athlete_id));
    const byAthlete = new Map(current.map(r => [r.athlete_id, r]));

    return NextResponse.json({
      athletes: (unavailable || []).map(a => {
        const h = byAthlete.get(a.id);
        return {
          athleteId: a.id, name: a.full_name, team: a.team, status: a.availability,
          reason: h?.reason ?? null,
          expectedReturn: h?.expected_return ?? null,
          reviewDate: h?.review_date ?? null,
          reviewDue: !!h?.review_date && h.review_date <= today,
          since: h?.created_at ?? null,
        };
      }),
    });
  }

  const athleteId = req.nextUrl.searchParams.get('athleteId') || '';
  if (!athleteId) return NextResponse.json({ error: 'athleteId or review=due required.' }, { status: 400 });

  const { data: ath } = await db.from('athletes').select('school_id').eq('id', athleteId).maybeSingle();
  if (!ath || ath.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const { data } = await db.from('athlete_status_history')
    .select('id,status,previous_status,reason,detail,expected_return,review_date,changed_by,created_at')
    .eq('athlete_id', athleteId).order('created_at', { ascending: false }).limit(50);

  return NextResponse.json({ history: data || [] });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const athleteId = String(body.athleteId || '');
  const status = String(body.status || '');
  if (!athleteId || !VALID.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID.join(', ')}` }, { status: 400 });
  }

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();
  const { data: ath } = await db.from('athletes')
    .select('school_id,availability,full_name').eq('id', athleteId).maybeSingle();
  if (!ath || ath.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const previous = ath.availability || 'Available';

  // 1. The field the rest of the app already reads
  const { error: updErr } = await db.from('athletes').update({ availability: status }).eq('id', athleteId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // 2. The record of the change
  await db.from('athlete_status_history').insert([{
    athlete_id: athleteId,
    school_id: schoolId,
    status,
    previous_status: previous,
    reason: body.reason ? String(body.reason) : null,
    detail: typeof body.detail === 'object' && body.detail ? body.detail : {},
    expected_return: body.expectedReturn || null,
    review_date: body.reviewDate || null,
    changed_by: auth.email || 'staff',
  }]);

  // 3. The timeline entry
  if (previous !== status) {
    void recordAthleteEvent({
      athleteId, schoolId,
      type: status === 'Available' && previous !== 'Available' ? 'injury_cleared'
           : status === 'Injured' ? 'injury_reported'
           : 'availability_changed',
      summary: `${previous} → ${status}${body.reason ? ` — ${body.reason}` : ''}`,
      detail: { from: previous, to: status, reason: body.reason ?? null, expectedReturn: body.expectedReturn ?? null },
      sourceTable: 'athlete_status_history', actor: auth.email || 'staff',
    });
  }

  return NextResponse.json({ ok: true, status, previous });
}
