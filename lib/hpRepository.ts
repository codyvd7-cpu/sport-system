// ─── HP Repository ─────────────────────────────────────────────────────────────
// Single backend logic layer for all HP data operations.
// All API routes should call these functions rather than querying Supabase directly.
// When school_id is added, update these functions — not every individual route.
//
// ─── DB migrations ──────────────────────────────────────────────────────────────
// 1+2. Upsert constraints + look-back indexes: see supabase-hp-integrity.sql
//      (saves upsert atomically once run; legacy fallback keeps working before)
//
// 3. school_id (multi-school): DONE — every function below takes a schoolId
//    and scopes its queries by it. HP auth has no user account behind it (a
//    shared access code), so the school is resolved at login from which code
//    was used, baked into the signed session cookie, and read back out by
//    each route via getHpSchoolId(). Passing null means "unscoped" and is
//    only safe for single-school installs — routes should reject null once
//    a second school exists.
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
  details: Record<string, unknown>,
  schoolId?: string | null
) {
  try {
    await db.from('hp_audit_log').insert([{ action, actor: actor || 'unknown', details, school_id: schoolId ?? null }]);
  } catch { /* never block the save */ }
}

// ── Students ─────────────────────────────────────────────────────────────────
export async function getActiveStudents(db: SupabaseClient, grade?: string, schoolId?: string | null) {
  let q = db.from('hp_students').select('*').eq('is_active', true).order('full_name');
  if (schoolId) q = q.eq('school_id', schoolId);
  if (grade && grade !== 'All') q = q.eq('grade', grade);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getStudentById(db: SupabaseClient, id: string, schoolId?: string | null) {
  let studentQ = db.from('hp_students').select('*').eq('id', id);
  if (schoolId) studentQ = studentQ.eq('school_id', schoolId);
  const [sRes, aRes, tRes] = await Promise.all([
    studentQ.maybeSingle(),
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
  opts: { year?: number; term?: string; studentId?: string; schoolId?: string | null }
) {
  let q = db.from('hp_test_results').select('*');
  if (opts.schoolId)  q = q.eq('school_id', opts.schoolId);
  if (opts.year)      q = q.eq('year', opts.year);
  if (opts.term)      q = q.eq('term', opts.term);
  if (opts.studentId) q = q.eq('student_id', opts.studentId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// The ONLY columns a client may write to hp_test_results. student_id and
// school_id are never taken from the payload — they are set from the validated
// student and the session's school. Anything else a client sends (id,
// created_at, a foreign school_id, an unknown column) is dropped (Blocker 1).
const TEST_RESULT_FIELDS: ReadonlySet<string> = new Set([
  'term', 'year', 'test_date',
  'sprint_10m', 'sprint_30m', 'agility_505_left', 'agility_505_right', 'cmj',
  'yoyo_ir1', 'rsa_best', 'rsa_mean', 'rsa_decrement', 'chin_up_hang', 'broad_jump',
  'pushup_2min', 'triple_broad_jump', 'run_500m', 'training_group', 'pushup_reps', 'pushup_hold',
]);

/**
 * Ownership gate for HP writes (Blocker 1). HP data is written with the
 * service-role client, which bypasses RLS — so a School A session handing in a
 * School B student_id would otherwise read, overwrite or attach rows against
 * that child. Every referenced student must be confirmed to belong to the
 * session's own school BEFORE any write. student_id is globally unique and a
 * student belongs to exactly one school, so this single check makes the
 * (student_id, …) upsert keys school-safe. Throws if any id is foreign/unknown.
 */
export async function assertStudentsInSchool(
  db: SupabaseClient,
  studentIds: string[],
  schoolId: string
): Promise<void> {
  const ids = [...new Set(studentIds.filter(Boolean))];
  if (!ids.length) throw new Error('No student specified.');
  const { data, error } = await db.from('hp_students')
    .select('id').eq('school_id', schoolId).in('id', ids);
  if (error) throw error;
  const found = new Set((data || []).map((r: { id: string }) => r.id));
  if (ids.some(id => !found.has(id))) {
    throw new Error('Student not found in this school.');
  }
}

export async function saveTestResult(
  db: SupabaseClient,
  payload: Record<string, unknown>,
  actor = 'hp-coach',
  schoolId?: string | null
) {
  if (!schoolId) throw new Error('A school context is required to save test results.');
  const { student_id, term, year } = payload as { student_id: string; term: string; year: number };
  if (!student_id || !term || !year) throw new Error('Missing required fields: student_id, term, year');

  // Ownership first — reject a student that is not this school's (Blocker 1).
  await assertStudentsInSchool(db, [student_id], schoolId);

  // Build the row from the allowlist only; student_id and school_id come from
  // validated values, never from arbitrary client input.
  const row: Record<string, unknown> = { student_id, school_id: schoolId };
  for (const [k, v] of Object.entries(payload)) {
    if (TEST_RESULT_FIELDS.has(k)) row[k] = v;
  }

  // Snapshot the existing row for the audit trail (old → new)
  const { data: existing } = await db.from('hp_test_results')
    .select('*')
    .eq('student_id', student_id).eq('term', term).eq('year', year)
    .maybeSingle();

  // Atomic upsert. The unique index (student_id, year, term) is guaranteed in
  // the database, so there is no delete-then-insert fallback any more — that
  // fallback deleted by student_id with no school guard, which was itself a
  // cross-school foot-gun (Blocker 1).
  const { error } = await db.from('hp_test_results')
    .upsert([row], { onConflict: 'student_id,year,term' });
  if (error) throw error;

  // Audit: record only the fields that actually changed
  const changes: Record<string, [unknown, unknown]> = {};
  Object.keys(row).forEach(k => {
    if (k === 'student_id' || k === 'id' || k === 'school_id') return;
    const before = existing ? existing[k] : undefined;
    const after = row[k];
    if (String(before ?? '') !== String(after ?? '')) changes[k] = [before ?? null, after ?? null];
  });
  if (Object.keys(changes).length) {
    await logAudit(db, 'save_test_result', actor, {
      student_id, year, term,
      new_record: !existing,
      changes,
    }, schoolId);
  }
}

// ── Attendance ────────────────────────────────────────────────────────────────
export async function getAttendance(
  db: SupabaseClient,
  opts: { year?: number; studentId?: string; limit?: number; schoolId?: string | null }
) {
  let q = db.from('hp_attendance').select('*').order('session_date', { ascending: false });
  if (opts.schoolId)  q = q.eq('school_id', opts.schoolId);
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
  actor = 'hp-coach',
  schoolId?: string | null
) {
  if (!schoolId) throw new Error('A school context is required to save attendance.');
  if (!date || !records.length) throw new Error('Missing date or records');
  const ids = records.map(r => r.student_id);

  // Ownership first — every student in the register must be this school's (Blocker 1).
  await assertStudentsInSchool(db, ids, schoolId);

  // Build clean rows from validated fields only; school_id from the session.
  const clean = records.map(r => ({
    student_id:   r.student_id,
    session_date: r.session_date || date,
    session_type: r.session_type ?? null,
    status:       r.status,
    school_id:    schoolId,
  }));

  // Snapshot existing register for this date + students (for the audit diff)
  const { data: existing } = await db.from('hp_attendance')
    .select('student_id,status')
    .eq('session_date', date).in('student_id', ids);
  const prevStatus: Record<string, string> = {};
  (existing || []).forEach(r => { prevStatus[r.student_id] = r.status; });

  // Atomic upsert. The unique index (student_id, session_date) is guaranteed in
  // the database, so no delete-then-insert fallback (it deleted by date+ids with
  // no school guard — a cross-school foot-gun; Blocker 1).
  const { error } = await db.from('hp_attendance')
    .upsert(clean, { onConflict: 'student_id,session_date' });
  if (error) throw error;

  // Audit: log which students' statuses changed (old → new), capped for size
  const changed = clean
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
    }, schoolId);
  }
}

// ── Dashboard aggregation ─────────────────────────────────────────────────────
export async function getDashboardData(db: SupabaseClient, year: number, schoolId?: string | null) {
  let studentsQ = db.from('hp_students').select('*').eq('is_active', true).order('full_name');
  let testsQ = db.from('hp_test_results').select('student_id, term, year').eq('year', year);
  let attQ = db.from('hp_attendance').select('student_id, session_date, status')
    .order('session_date', { ascending: false }).limit(2000);
  if (schoolId) {
    studentsQ = studentsQ.eq('school_id', schoolId);
    testsQ = testsQ.eq('school_id', schoolId);
    attQ = attQ.eq('school_id', schoolId);
  }
  const [students, tests, attendance] = await Promise.all([studentsQ, testsQ, attQ]);
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
