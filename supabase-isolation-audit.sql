-- ═══════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANCY ISOLATION AUDIT
--
-- Run this in the Supabase SQL editor any time — especially before onboarding
-- a new school, and after any migration. It's read-only: it changes nothing,
-- it only reports.
--
-- It checks three classes of failure:
--   A. NULL school_id  — rows belonging to nobody. These are invisible to
--                        school-scoped queries (data that silently vanishes)
--                        or, worse, visible to everybody depending on the
--                        policy. Either way: a bug.
--   B. Cross-school references — a child row pointing at a parent row from a
--                        DIFFERENT school (e.g. an attendance record for
--                        School A tagged as School B). Means scoping broke
--                        somewhere in the write path.
--   C. RLS coverage    — any tenant table with RLS switched off, or with no
--                        policies at all.
--
-- Anything that comes back with a non-zero count needs investigating before
-- a second school's data goes in.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── A. ROWS WITH NO SCHOOL ────────────────────────────────────────────────────
-- Expect: 0 for every row. Non-zero means writes are landing without a school.
SELECT 'A. orphaned rows (school_id IS NULL)' AS check_type, '' AS table_name, NULL::bigint AS bad_rows
WHERE false
UNION ALL SELECT 'A', 'athletes',                  count(*) FROM athletes                  WHERE school_id IS NULL
UNION ALL SELECT 'A', 'athlete_sports',            count(*) FROM athlete_sports            WHERE school_id IS NULL
UNION ALL SELECT 'A', 'attendance',                count(*) FROM attendance                WHERE school_id IS NULL
UNION ALL SELECT 'A', 'coach_notes',               count(*) FROM coach_notes               WHERE school_id IS NULL
UNION ALL SELECT 'A', 'performance_tests',         count(*) FROM performance_tests         WHERE school_id IS NULL
UNION ALL SELECT 'A', 'staff_roles',               count(*) FROM staff_roles               WHERE school_id IS NULL
UNION ALL SELECT 'A', 'hp_students',               count(*) FROM hp_students               WHERE school_id IS NULL
UNION ALL SELECT 'A', 'hp_attendance',             count(*) FROM hp_attendance             WHERE school_id IS NULL
UNION ALL SELECT 'A', 'hp_test_results',           count(*) FROM hp_test_results           WHERE school_id IS NULL
UNION ALL SELECT 'A', 'gym_checkins',              count(*) FROM gym_checkins              WHERE school_id IS NULL
UNION ALL SELECT 'A', 'workout_logs',              count(*) FROM workout_logs              WHERE school_id IS NULL
UNION ALL SELECT 'A', 'workout_programs',          count(*) FROM workout_programs          WHERE school_id IS NULL
UNION ALL SELECT 'A', 'workout_program_exercises', count(*) FROM workout_program_exercises WHERE school_id IS NULL
UNION ALL SELECT 'A', 'portal_fixtures',           count(*) FROM portal_fixtures           WHERE school_id IS NULL
UNION ALL SELECT 'A', 'portal_results',            count(*) FROM portal_results            WHERE school_id IS NULL
UNION ALL SELECT 'A', 'portal_reminders',          count(*) FROM portal_reminders          WHERE school_id IS NULL
UNION ALL SELECT 'A', 'portal_programs',           count(*) FROM portal_programs           WHERE school_id IS NULL
UNION ALL SELECT 'A', 'portal_sponsors',           count(*) FROM portal_sponsors           WHERE school_id IS NULL
UNION ALL SELECT 'A', 'portal_spotlight',          count(*) FROM portal_spotlight          WHERE school_id IS NULL
UNION ALL SELECT 'A', 'portal_week_plans',         count(*) FROM portal_week_plans         WHERE school_id IS NULL
UNION ALL SELECT 'A', 'portal_week_plan_items',    count(*) FROM portal_week_plan_items    WHERE school_id IS NULL
UNION ALL SELECT 'A', 'player_profiles',           count(*) FROM player_profiles           WHERE school_id IS NULL
UNION ALL SELECT 'A', 'urgent_alerts',             count(*) FROM urgent_alerts             WHERE school_id IS NULL
ORDER BY 3 DESC NULLS LAST;


-- ── B. CROSS-SCHOOL REFERENCES ────────────────────────────────────────────────
-- A child row whose school_id doesn't match its parent's. Expect: 0 everywhere.
-- Non-zero here is the serious one — it means one school's record is filed
-- under another school.
SELECT 'B. cross-school reference' AS check_type, 'attendance -> athletes' AS relationship, count(*) AS bad_rows
FROM attendance a JOIN athletes ath ON ath.id = a.athlete_id
WHERE a.school_id IS DISTINCT FROM ath.school_id
UNION ALL
SELECT 'B', 'coach_notes -> athletes', count(*)
FROM coach_notes c JOIN athletes ath ON ath.id = c.athlete_id
WHERE c.school_id IS DISTINCT FROM ath.school_id
UNION ALL
SELECT 'B', 'performance_tests -> athletes', count(*)
FROM performance_tests p JOIN athletes ath ON ath.id = p.athlete_id
WHERE p.school_id IS DISTINCT FROM ath.school_id
UNION ALL
SELECT 'B', 'athlete_sports -> athletes', count(*)
FROM athlete_sports s JOIN athletes ath ON ath.id = s.athlete_id
WHERE s.school_id IS DISTINCT FROM ath.school_id
UNION ALL
SELECT 'B', 'gym_checkins -> athletes', count(*)
FROM gym_checkins g JOIN athletes ath ON ath.id = g.athlete_id
WHERE g.school_id IS DISTINCT FROM ath.school_id
UNION ALL
SELECT 'B', 'workout_logs -> athletes', count(*)
FROM workout_logs w JOIN athletes ath ON ath.id = w.athlete_id
WHERE w.school_id IS DISTINCT FROM ath.school_id
UNION ALL
SELECT 'B', 'workout_program_exercises -> workout_programs', count(*)
FROM workout_program_exercises e JOIN workout_programs p ON p.id = e.program_id
WHERE e.school_id IS DISTINCT FROM p.school_id
UNION ALL
SELECT 'B', 'portal_week_plan_items -> portal_week_plans', count(*)
FROM portal_week_plan_items i JOIN portal_week_plans p ON p.id = i.week_plan_id
WHERE i.school_id IS DISTINCT FROM p.school_id
UNION ALL
SELECT 'B', 'hp_attendance -> hp_students', count(*)
FROM hp_attendance a JOIN hp_students s ON s.id = a.student_id
WHERE a.school_id IS DISTINCT FROM s.school_id
UNION ALL
SELECT 'B', 'hp_test_results -> hp_students', count(*)
FROM hp_test_results t JOIN hp_students s ON s.id = t.student_id
WHERE t.school_id IS DISTINCT FROM s.school_id
UNION ALL
SELECT 'B', 'player_profiles -> athletes', count(*)
FROM player_profiles pp JOIN athletes ath ON ath.id = pp.athlete_id
WHERE pp.school_id IS DISTINCT FROM ath.school_id
ORDER BY 3 DESC;


-- ── C. RLS COVERAGE ───────────────────────────────────────────────────────────
-- Every tenant table should have rowsecurity = true. A table with RLS on but
-- zero policies is locked to service-role only, which is intentional for some
-- (player_profiles, audit logs) — check the notes column before panicking.
SELECT
  'C. RLS coverage' AS check_type,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  count(p.polname) AS policy_count,
  CASE
    WHEN NOT c.relrowsecurity THEN '*** RLS OFF — investigate ***'
    WHEN count(p.polname) = 0 THEN 'locked to service-role (intentional for some tables)'
    ELSE 'ok'
  END AS notes
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'athletes','athlete_sports','attendance','coach_notes','performance_tests','staff_roles',
    'hp_students','hp_attendance','hp_test_results','hp_audit_log','hp_access_codes',
    'gym_checkins','workout_logs','workout_programs','workout_program_exercises',
    'portal_fixtures','portal_results','portal_reminders','portal_programs','portal_sponsors',
    'portal_spotlight','portal_week_plans','portal_week_plan_items','portal_access_codes',
    'player_profiles','push_subscriptions','urgent_alerts','audit_log','schools'
  )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relrowsecurity ASC, count(p.polname) ASC, c.relname;


-- ── D. SCHOOL SUMMARY ─────────────────────────────────────────────────────────
-- Sanity view: how much data each school actually has.
SELECT
  s.name AS school,
  s.slug,
  (SELECT count(*) FROM athletes      a WHERE a.school_id = s.id) AS athletes,
  (SELECT count(*) FROM staff_roles   r WHERE r.school_id = s.id) AS staff,
  (SELECT count(*) FROM hp_students   h WHERE h.school_id = s.id) AS hp_students,
  (SELECT count(*) FROM portal_fixtures f WHERE f.school_id = s.id) AS fixtures,
  s.is_active
FROM schools s
ORDER BY s.created_at;
