// ─── HP Repository ─────────────────────────────────────────────────────────────
// Single backend logic layer for all HP data operations.
// All API routes should call these functions rather than querying Supabase directly.
// When school_id is added, update these functions — not every individual route.
//
// ─── Pending DB migrations (run in Supabase SQL editor when ready) ─────────────
// 1. Upsert constraint:
//    ALTER TABLE hp_test_results ADD CONSTRAINT hp_test_results_unique
//      UNIQUE (student_id, year, term);
//    Then replace delete+insert in saveTestResult() with:
//    db.from('hp_test_results').upsert([payload], { onConflict: 'student_id,year,term' })
//
// 2. Attendance constraint:
//    ALTER TABLE hp_attendance ADD CONSTRAINT hp_attendance_unique
//      UNIQUE (student_id, session_date);
//    Then replace delete+insert in saveAttendance() with .upsert()
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
  payload: Record<string, unknown>
) {
  const { student_id, term, year } = payload as { student_id: string; term: string; year: number };
  if (!student_id || !term || !year) throw new Error('Missing required fields: student_id, term, year');
  // Delete-then-insert until DB upsert constraint is added on (student_id, year, term)
  // TODO: replace with .upsert() once unique constraint exists
  await db.from('hp_test_results')
    .delete()
    .eq('student_id', student_id)
    .eq('term', term)
    .eq('year', year);
  const { error } = await db.from('hp_test_results').insert([payload]);
  if (error) throw error;
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
  records: Array<{ student_id: string; session_date: string; session_type?: string; status: string }>
) {
  if (!date || !records.length) throw new Error('Missing date or records');
  const ids = records.map(r => r.student_id);
  // Delete existing records for this date + these students, then insert fresh
  // TODO: replace with upsert once (student_id, session_date) unique constraint exists
  await db.from('hp_attendance').delete().eq('session_date', date).in('student_id', ids);
  const { error } = await db.from('hp_attendance').insert(records);
  if (error) throw error;
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
