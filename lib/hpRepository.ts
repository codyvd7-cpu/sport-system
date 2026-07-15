// ─── HP Repository ─────────────────────────────────────────────────────────────
// Single backend logic layer for all HP data operations.
// All API routes should call these functions rather than querying Supabase directly.
// When school_id is added, update these functions — not every individual route.
//
// ─── DB migrations ──────────────────────────────────────────────────────────────
// 1+2. Upsert constraints + look-back indexes: see supabase-hp-integrity.sql
//      (saves upsert atomically once run; legacy fallback keeps working before)
//
// 3. school_id (multi-school):
//    ALTER TABLE hp_students     ADD COLUMN school_id uuid REFERENCES schools(id);
//    ALTER TABLE hp_test_results ADD COLUMN school_id uuid REFERENCES schools(id);
//    ALTER TABLE hp_attendance   ADD COLUMN school_id uuid REFERENCES schools(id);
//    Then add .eq('school_id', schoolId) to every query in this file.
// ──────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HP_SCHOOL } from './hpConfig';

// ── Admin client (service role — never expose to browser) ─────────────────────
export function getHpAdmin(): SupabaseClient {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server misconfigured: missing Supabase credentials.');
  return createClient(url, key);
}

// ── Audit logging ──────────────────────────────────────────────────────────────
// Fire-and-forget change log. Never throws — an audit failure must never block
// a save. Gives full look-back: who changed what, old → new, when.
export async function logAudit(
  db: SupabaseClient,
  action: string,
  actor: string,
  details: Record<string, unknown>
) {
  try {
    await db.from('hp_audit_log').insert([{ action, actor: actor || 'unknown', details }]);
  } catch { /* never block the save */ }
}

// ── Students ─────────────────────────────────────────────────────────────────
export async function getActiveStudents(db: SupabaseClient, grade?: string) {
  let q = db.from('hp_students').select('*').eq('is_active', true).order('full_name');
  if (grade && grade !== 'All') q = q.eq('grade', grade);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getStudentById(db: SupabaseClient, id: string) {
  const [sRes, aRes, tRes] = await Promise.all([
    db.from('hp_students').select('*').eq('id', id).single(),
    db.from('hp_attendance').select('*').eq('student_id', id).order('session_date', { ascending: false }),
    db.from('hp_test_results').select('*').eq('student_id', id).order('year').order('term'),
  ]);
  return {
    student:    sRes.data,
    attendance: aRes.data || [],
    tests:      tRes.data || [],
  };
}

// ── Test results ──────────────────────────────────────────────────────────────
export async function getTestResults(
  db: SupabaseClient,
  opts: { year?: number; term?: string; studentId?: string }
) {
  let q = db.from('hp_test_results').select('*');
  if (opts.year)      q = q.eq('year', opts.year);
  if (opts.term)      q = q.eq('term', opts.term);
  if (opts.studentId) q = q.eq('student_id', opts.studentId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveTestResult(
  db: SupabaseClient,
  payload: Record<string, unknown>,
  actor = 'hp-coach'
) {
  const { student_id, term, year } = payload as { student_id: string; term: string; year: number };
  if (!student_id || !term || !year) throw new Error('Missing required fields: student_id, term, year');

  // Snapshot the existing row for the audit trail (old → new)
  const { data: existing } = await db.from('hp_test_results')
    .select('*')
    .eq('student_id', student_id).eq('term', term).eq('year', year)
    .maybeSingle();

  // Atomic upsert — requires the unique constraint from supabase-hp-integrity.sql.
  // Falls back to legacy delete+insert if the constraint hasn't been applied yet.
  const { error } = await db.from('hp_test_results')
    .upsert([payload], { onConflict: 'student_id,year,term' });
  if (error) {
    if (/no unique|exclusion constraint|ON CONFLICT/i.test(error.message || '')) {
      await db.from('hp_test_results').delete()
        .eq('student_id', student_id).eq('term', term).eq('year', year);
      const { error: insErr } = await db.from('hp_test_results').insert([payload]);
      if (insErr) throw insErr;
    } else {
      throw error;
    }
  }

  // Audit: record only the fields that actually changed
  const changes: Record<string, [unknown, unknown]> = {};
  Object.keys(payload).forEach(k => {
    if (k === 'student_id' || k === 'id') return;
    const before = existing ? existing[k] : undefined;
    const after = payload[k];
    if (String(before ?? '') !== String(after ?? '')) changes[k] = [before ?? null, after ?? null];
  });
  if (Object.keys(changes).length) {
    await logAudit(db, 'save_test_result', actor, {
      student_id, year, term,
      new_record: !existing,
      changes,
    });
  }
}

// ── Attendance ────────────────────────────────────────────────────────────────
export async function getAttendance(
  db: SupabaseClient,
  opts: { year?: number; studentId?: string; limit?: number }
) {
  let q = db.from('hp_attendance').select('*').order('session_date', { ascending: false });
  if (opts.studentId) q = q.eq('student_id', opts.studentId);
  if (opts.limit)     q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveAttendance(
  db: SupabaseClient,
  date: string,
  records: Array<{ student_id: string; session_date: string; session_type?: string; status: string }>,
  actor = 'hp-coach'
) {
  if (!date || !records.length) throw new Error('Missing date or records');
  const ids = records.map(r => r.student_id);

  // Snapshot existing register for this date + students (for the audit diff)
  const { data: existing } = await db.from('hp_attendance')
    .select('student_id,status')
    .eq('session_date', date).in('student_id', ids);
  const prevStatus: Record<string, string> = {};
  (existing || []).forEach(r => { prevStatus[r.student_id] = r.status; });

  // Atomic upsert — requires the unique constraint from supabase-hp-integrity.sql.
  // Falls back to legacy delete+insert if the constraint hasn't been applied yet.
  const { error } = await db.from('hp_attendance')
    .upsert(records, { onConflict: 'student_id,session_date' });
  if (error) {
    if (/no unique|exclusion constraint|ON CONFLICT/i.test(error.message || '')) {
      await db.from('hp_attendance').delete().eq('session_date', date).in('student_id', ids);
      const { error: insErr } = await db.from('hp_attendance').insert(records);
      if (insErr) throw insErr;
    } else {
      throw error;
    }
  }

  // Audit: log which students' statuses changed (old → new), capped for size
  const changed = records
    .filter(r => (prevStatus[r.student_id] ?? null) !== r.status)
    .map(r => ({ student_id: r.student_id, from: prevStatus[r.student_id] ?? null, to: r.status }))
    .slice(0, 80);
  if (changed.length) {
    await logAudit(db, 'save_attendance', actor, {
      date,
      session_type: records[0]?.session_type || 'HP Training',
      total_records: records.length,
      changed_count: changed.length,
      new_session: (existing || []).length === 0,
      changed,
    });
  }
}

// ── Dashboard aggregation ─────────────────────────────────────────────────────
export async function getDashboardData(db: SupabaseClient, year: number) {
  const [students, tests, attendance] = await Promise.all([
    db.from('hp_students').select('*').eq('is_active', true).order('full_name'),
    db.from('hp_test_results').select('student_id, term, year').eq('year', year),
    db.from('hp_attendance').select('student_id, session_date, status')
       .order('session_date', { ascending: false }).limit(2000),
  ]);
  return {
    students:   students.data  || [],
    tests:      tests.data     || [],
    attendance: attendance.data || [],
  };
}

// ── School config (for reports, AI prompts etc.) ──────────────────────────────
export function getSchoolContext() {
  return {
    name:     HP_SCHOOL.name,
    short:    HP_SCHOOL.shortName,
    location: HP_SCHOOL.location,
  };
}
