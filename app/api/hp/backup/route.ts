import { NextRequest, NextResponse } from 'next/server';
import { requireHpSchoolId, isHpAdmin } from '@/lib/serverAuth';
import { getHpAdmin } from '@/lib/hpRepository';

// GET  → export full HP dataset as JSON download
// POST → restore from JSON backup (requires confirm=true in body)
export async function GET(req: NextRequest) {
  const schoolId = requireHpSchoolId(req);
  if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isHpAdmin(req)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const db = getHpAdmin();
    // Page through every row for this school. A single select is capped by the
    // API row limit (≈1000), so a school with more attendance/test rows than
    // that would have exported a SILENTLY TRUNCATED backup (Blocker 8).
    const PAGE = 1000;
    const fetchAll = async (table: string, orderCols: string[]): Promise<any[]> => {
      const all: any[] = [];
      for (let from = 0; ; from += PAGE) {
        let q = db.from(table).select('*').eq('school_id', schoolId);
        for (const c of orderCols) q = q.order(c);
        const { data, error } = await q.range(from, from + PAGE - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        all.push(...(data || []));
        if (!data || data.length < PAGE) break;
      }
      return all;
    };

    const students = await fetchAll('hp_students', ['full_name']);
    const test_results = await fetchAll('hp_test_results', ['year', 'term']);
    const attendance = await fetchAll('hp_attendance', ['session_date']);

    const backup = {
      exported_at:  new Date().toISOString(),
      exported_by:  'HP Admin',
      version:      '1.0',
      school_id:    schoolId,
      // Counts travel with the file so a restore (or the admin) can verify the
      // export wasn't truncated.
      row_counts:   { students: students.length, test_results: test_results.length, attendance: attendance.length },
      students,
      test_results,
      attendance,
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
  const schoolId = requireHpSchoolId(req);
  if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isHpAdmin(req)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  try {
    const body = await req.json();
    if (!body.confirm) return NextResponse.json({ error: 'Must pass confirm:true to restore.' }, { status: 400 });
    if (!body.backup || typeof body.backup !== 'object') {
      return NextResponse.json({ error: 'Invalid backup format.' }, { status: 400 });
    }
    const { students, test_results, attendance, version } = body.backup;
    if (!Array.isArray(students) || !Array.isArray(test_results) || !Array.isArray(attendance)) {
      return NextResponse.json({ error: 'Invalid backup format.' }, { status: 400 });
    }
    // Schema-version compatibility — only restore a backup this code understands.
    const major = String(version || '1.0').split('.')[0];
    if (major !== '1') {
      return NextResponse.json({ error: `Unsupported backup version "${version}".` }, { status: 400 });
    }
    const db = getHpAdmin();
    // Force every incoming row to the restoring session's own school. The
    // uploaded file is untrusted input — if it carried another school's
    // school_id, an unscoped restore would write straight into their data.
    const reTag = (rows: any[]) => rows.map(r => ({ ...r, school_id: schoolId }));
    const safeStudents = reTag(students);
    const safeTests    = reTag(test_results);
    const safeAtt      = reTag(attendance);

    // Reject any id that already belongs to ANOTHER school. The upserts key on
    // the global primary key `id`, so a crafted backup carrying another
    // school's ids would otherwise overwrite their rows and reassign them to
    // this school (AP-05). Re-tagging school_id alone doesn't stop that — the
    // conflict is resolved on id, not school.
    const collides = async (table: string, rows: any[]) => {
      const ids = rows.map(r => r.id).filter(Boolean);
      if (!ids.length) return false;
      const { data } = await db.from(table).select('id').in('id', ids).neq('school_id', schoolId).limit(1);
      return !!(data && data.length);
    };
    const [sClash, tClash, aClash] = await Promise.all([
      collides('hp_students', safeStudents),
      collides('hp_test_results', safeTests),
      collides('hp_attendance', safeAtt),
    ]);
    if (sClash || tClash || aClash) {
      return NextResponse.json({ error: 'This backup contains records that belong to another school and cannot be restored here.' }, { status: 409 });
    }

    // Restore with CHECKED results and the RIGHT ORDER. Two bugs here before:
    //  1. Promise.allSettled only caught *rejected* promises, but a Supabase
    //     upsert resolves with an { error } value — so three failed writes
    //     returned 200 with "restored 1/1/1" (Blocker 8). We now read .error
    //     and count the rows actually written (.select('id')).
    //  2. All three ran concurrently, so test/attendance children could be
    //     inserted before their parent student existed. Students go FIRST.
    const restoreTable = async (table: string, rows: any[]): Promise<number> => {
      if (rows.length === 0) return 0;
      const { data, error } = await db.from(table).upsert(rows, { onConflict: 'id' }).select('id');
      if (error) throw new Error(`${table}: ${error.message}`);
      return data?.length ?? 0;
    };

    const restored = { students: 0, test_results: 0, attendance: 0 };
    try {
      restored.students = await restoreTable('hp_students', safeStudents);
      // Children only after their parent students are in place.
      const [t, a] = await Promise.all([
        restoreTable('hp_test_results', safeTests),
        restoreTable('hp_attendance', safeAtt),
      ]);
      restored.test_results = t;
      restored.attendance = a;
    } catch (e: any) {
      // Honest failure — report what did land and that the restore did NOT
      // complete. Never return success for a failed restore.
      return NextResponse.json({ ok: false, error: e.message, restored, complete: false }, { status: 500 });
    }

    // Log the restore with the ACTUAL counts written.
    await db.from('hp_audit_log').insert([{
      action: 'backup_restored',
      actor: 'HP Admin',
      details: restored,
      school_id: schoolId,
    }]);
    return NextResponse.json({ ok: true, restored });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
