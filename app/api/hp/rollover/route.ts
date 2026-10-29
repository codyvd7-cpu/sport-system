import { NextRequest, NextResponse } from 'next/server';
import { requireHpSchoolId, getHpActor } from '@/lib/serverAuth';
import { getHpAdmin } from '@/lib/hpRepository';

// ─── /api/hp/rollover ─────────────────────────────────────────────────────────
// Year-end rollover, server-side and school-scoped.
//
// The rollover admin page used to drive these bulk mutations straight from the
// browser Supabase client (AP-26). HP auth is a signed cookie, not a Supabase
// session, so those calls ran as the anon role — they either hit RLS and did
// nothing, or (where a policy was permissive) read and wrote across EVERY
// school's students, and newly-added Grade 8s were inserted with no school_id
// at all. Everything now goes through this endpoint behind requireHpSchoolId,
// so each operation is proven to belong to exactly one school.

type Action = 'graduate' | 'promote' | 'add';

async function writeAudit(db: ReturnType<typeof getHpAdmin>, schoolId: string, action: string, actor: string, details: Record<string, unknown>) {
  try {
    await db.from('hp_audit_log').insert([{ action, actor: actor || 'HP Admin', details, school_id: schoolId }]);
  } catch { /* audit is best-effort; never fail the rollover on a log write */ }
}

export async function GET(req: NextRequest) {
  const schoolId = requireHpSchoolId(req);
  if (!schoolId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const db = getHpAdmin();
  const { data, error } = await db.from('hp_students')
    .select('id,full_name,grade,class_group,training_group')
    .eq('is_active', true).eq('school_id', schoolId).order('full_name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ students: data || [] });
}

export async function POST(req: NextRequest) {
  const schoolId = requireHpSchoolId(req);
  if (!schoolId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const db = getHpAdmin();
  const actor = getHpActor(req);
  const year = new Date().getFullYear();
  const body = await req.json().catch(() => ({} as Record<string, any>));
  const action = String(body.action || '') as Action;

  try {
    if (action === 'graduate') {
      // Archive every active Grade 9 in THIS school. The .select() returns the
      // rows actually touched, so the count is real and school-bounded.
      const { data, error } = await db.from('hp_students')
        .update({ is_active: false, notes: `Graduated ${year}` })
        .eq('is_active', true).eq('grade', 'Grade 9').eq('school_id', schoolId)
        .select('id');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const count = data?.length || 0;
      await writeAudit(db, schoolId, 'students_archived', actor, { count, reason: `Graduated ${year}` });
      return NextResponse.json({ ok: true, count });
    }

    if (action === 'promote') {
      const { data, error } = await db.from('hp_students')
        .update({ grade: 'Grade 9', training_group: null })
        .eq('is_active', true).eq('grade', 'Grade 8').eq('school_id', schoolId)
        .select('id');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const count = data?.length || 0;
      await writeAudit(db, schoolId, 'grade_promoted', actor, { count, from: 'Grade 8', to: 'Grade 9', year });
      return NextResponse.json({ ok: true, count });
    }

    if (action === 'add') {
      const names = Array.isArray(body.names)
        ? body.names.map((n: unknown) => String(n).trim()).filter(Boolean)
        : [];
      const classGroup = String(body.class_group || '').trim();
      if (!names.length) return NextResponse.json({ error: 'No names provided.' }, { status: 400 });
      if (!classGroup) return NextResponse.json({ error: 'Class is required.' }, { status: 400 });
      const rows = names.map((full_name: string) => ({
        full_name, grade: 'Grade 8', class_group: classGroup, is_active: true, school_id: schoolId,
      }));
      const { error } = await db.from('hp_students').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await writeAudit(db, schoolId, 'students_added', actor, { count: names.length, class_group: classGroup });
      return NextResponse.json({ ok: true, count: names.length });
    }

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
