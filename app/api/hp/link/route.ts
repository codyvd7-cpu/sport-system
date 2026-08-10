import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/hp/link ─────────────────────────────────────────────────────────────
// Connects HP student records to athlete records so one young person has one
// development record.
//
// Deliberate design choice: this SUGGESTS matches and requires a human to
// confirm each one. It never links automatically. Names duplicate within a
// grade, get typed inconsistently, and change — an automatic match would
// silently attach one child's test results to another child's profile, which
// is both a data-integrity problem and a privacy one.
//
// GET  ?unlinked=1 → HP students with no athlete, each with ranked suggestions
// POST { hpStudentId, athleteId } → confirm a link
// DELETE { hpStudentId }          → undo a link

/** Similarity for suggestion ranking only — never used to link automatically. */
function similarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;

  const xt = new Set(x.split(' '));
  const yt = new Set(y.split(' '));
  const shared = [...xt].filter(t => yt.has(t)).length;
  const tokenScore = shared / Math.max(xt.size, yt.size);

  // Surname agreement matters more than a shared first name
  const xs = x.split(' ').pop() || '', ys = y.split(' ').pop() || '';
  const surnameBonus = xs && xs === ys ? 0.25 : 0;

  return Math.min(1, tokenScore + surnameBonus);
}

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const db = getAdmin();
  const [{ data: students }, { data: athletes }] = await Promise.all([
    db.from('hp_students').select('id,full_name,grade,class_group,athlete_id')
      .eq('school_id', schoolId).eq('is_active', true).order('full_name'),
    db.from('athletes').select('id,full_name,team,age_group')
      .eq('school_id', schoolId).eq('is_active', true).order('full_name'),
  ]);

  const allAthletes = athletes || [];
  const takenAthleteIds = new Set((students || []).map(s => s.athlete_id).filter(Boolean));

  const unlinked = (students || []).filter(s => !s.athlete_id).map(s => {
    const suggestions = allAthletes
      .filter(a => !takenAthleteIds.has(a.id))
      .map(a => ({ athleteId: a.id, name: a.full_name, team: a.team, score: similarity(s.full_name, a.full_name) }))
      .filter(x => x.score >= 0.5)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3);
    return {
      hpStudentId: s.id, name: s.full_name, grade: s.grade, classGroup: s.class_group,
      suggestions,
      // Only ever advisory. A single strong match is still shown for
      // confirmation rather than applied.
      confident: suggestions.length === 1 && suggestions[0].score >= 0.95,
    };
  });

  const linked = (students || []).filter(s => s.athlete_id).map(s => {
    const a = allAthletes.find(x => x.id === s.athlete_id);
    return { hpStudentId: s.id, name: s.full_name, athleteId: s.athlete_id, athleteName: a?.full_name ?? '(athlete removed)', team: a?.team ?? null };
  });

  return NextResponse.json({
    unlinked, linked,
    counts: { hpStudents: (students || []).length, athletes: allAthletes.length, linked: linked.length },
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const hpStudentId = String(body.hpStudentId || '');
  const athleteId = String(body.athleteId || '');
  if (!hpStudentId || !athleteId) {
    return NextResponse.json({ error: 'hpStudentId and athleteId are required.' }, { status: 400 });
  }

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();

  // Both records must belong to the caller's school
  const [{ data: student }, { data: athlete }] = await Promise.all([
    db.from('hp_students').select('id,school_id').eq('id', hpStudentId).maybeSingle(),
    db.from('athletes').select('id,school_id').eq('id', athleteId).maybeSingle(),
  ]);
  if (!student || student.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (!athlete || athlete.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  // One athlete, one HP record
  const { data: clash } = await db.from('hp_students')
    .select('id,full_name').eq('athlete_id', athleteId).neq('id', hpStudentId).maybeSingle();
  if (clash) {
    return NextResponse.json({ error: `That athlete is already linked to ${clash.full_name}.` }, { status: 409 });
  }

  const { error } = await db.from('hp_students').update({
    athlete_id: athleteId,
    link_method: body.method ? String(body.method) : 'manual',
    linked_at: new Date().toISOString(),
    linked_by: auth.email || 'staff',
  }).eq('id', hpStudentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const hpStudentId = String(body.hpStudentId || '');
  if (!hpStudentId) return NextResponse.json({ error: 'hpStudentId required.' }, { status: 400 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  const db = getAdmin();
  const { data: student } = await db.from('hp_students').select('id,school_id').eq('id', hpStudentId).maybeSingle();
  if (!student || student.school_id !== schoolId) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await db.from('hp_students').update({
    athlete_id: null, link_method: null, linked_at: null, linked_by: null,
  }).eq('id', hpStudentId);

  return NextResponse.json({ ok: true });
}
