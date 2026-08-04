import { NextRequest, NextResponse } from 'next/server';
import { verifyHpCookie, getHpSchoolId } from '@/lib/serverAuth';
import { getHpAdmin } from '@/lib/hpRepository';

// GET  → export full HP dataset as JSON download
// POST → restore from JSON backup (requires confirm=true in body)
export async function GET(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getHpAdmin();
    const schoolId = getHpSchoolId(req);
    // Export only this school's data — an unscoped export would hand one
    // school a full copy of every other school's students and results.
    const scope = (q: any) => (schoolId ? q.eq('school_id', schoolId) : q);
    const [students, tests, attendance] = await Promise.all([
      scope(db.from('hp_students').select('*')).order('full_name'),
      scope(db.from('hp_test_results').select('*')).order('year').order('term'),
      scope(db.from('hp_attendance').select('*')).order('session_date'),
    ]);
    const backup = {
      exported_at:  new Date().toISOString(),
      exported_by:  'HP Admin',
      version:      '1.0',
      students:     students.data  || [],
      test_results: tests.data     || [],
      attendance:   attendance.data || [],
    };
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="HP_Backup_${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.confirm) return NextResponse.json({ error: 'Must pass confirm:true to restore.' }, { status: 400 });
    const { students, test_results, attendance } = body.backup;
    if (!students || !test_results || !attendance) {
      return NextResponse.json({ error: 'Invalid backup format.' }, { status: 400 });
    }
    const db = getHpAdmin();
    const schoolId = getHpSchoolId(req);
    // Force every incoming row to the restoring session's own school. The
    // uploaded file is untrusted input — if it carried another school's
    // school_id, an unscoped restore would write straight into their data.
    const reTag = (rows: any[]) => (schoolId ? rows.map(r => ({ ...r, school_id: schoolId })) : rows);
    const safeStudents = reTag(students);
    const safeTests    = reTag(test_results);
    const safeAtt      = reTag(attendance);
    // Upsert all records — preserves existing data, fills in gaps
    const results = await Promise.allSettled([
      safeStudents.length > 0 ? db.from('hp_students').upsert(safeStudents, { onConflict: 'id' })  : Promise.resolve(),
      safeTests.length    > 0 ? db.from('hp_test_results').upsert(safeTests, { onConflict: 'id' }) : Promise.resolve(),
      safeAtt.length      > 0 ? db.from('hp_attendance').upsert(safeAtt, { onConflict: 'id' })     : Promise.resolve(),
    ]);
    const errors = results.filter(r => r.status === 'rejected').map(r => (r as any).reason?.message);
    if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 500 });
    // Log the restore
    await db.from('hp_audit_log').insert([{
      action: 'backup_restored',
      actor: 'HP Admin',
      details: { students: students.length, test_results: test_results.length, attendance: attendance.length },
      school_id: schoolId,
    }]);
    return NextResponse.json({ ok: true, restored: { students: students.length, test_results: test_results.length, attendance: attendance.length } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
