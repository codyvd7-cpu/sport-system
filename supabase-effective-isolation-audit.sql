-- ═══════════════════════════════════════════════════════════════════════════════
-- EFFECTIVE ISOLATION AUDIT
--
-- Run after ANY policy or schema change, and before onboarding a school.
--
-- Why this exists: the earlier audit checked that RLS was ENABLED and that
-- correct policies EXISTED. Both passed — while isolation was in fact broken.
-- Legacy `USING (true)` policies were still present alongside the correct ones,
-- and because Postgres OR's permissive policies together, a single blanket
-- policy silently defeated every properly scoped one beside it.
--
-- The lesson: checking that a policy exists proves nothing. This script
-- IMPERSONATES a real user and checks what they can actually read.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── CHECK A: any blanket USING(true) policy on a table holding personal data ──
-- Expect ZERO rows. Anything here defeats school scoping on that table.
SELECT c.relname AS table_name, p.polname AS policy, p.polcmd AS cmd,
       p.polroles::regrole[] AS granted_to,
       '*** BLANKET POLICY — DEFEATS SCOPING ***' AS problem
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND pg_get_expr(p.polqual, p.polrelid) = 'true'
  -- Portal content and sport lists are intentionally public (parents read them
  -- before signing in) and contain no personal data.
  AND c.relname NOT IN (
    'portal_fixtures','portal_results','portal_reminders','portal_programs',
    'portal_sponsors','portal_spotlight','portal_week_plans','portal_week_plan_items',
    'workout_programs','workout_program_exercises','school_sports'
  )
ORDER BY c.relname, p.polname;


-- ── CHECK B: RLS enabled everywhere it matters ───────────────────────────────
-- Expect every row to read 'ok' or 'service-role only'.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_on, count(p.polname) AS policies,
  CASE WHEN NOT c.relrowsecurity THEN '*** RLS OFF ***'
       WHEN count(p.polname) = 0 THEN 'service-role only'
       ELSE 'ok' END AS verdict
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public' AND c.relkind = 'r'
  AND c.relname IN (
    'athletes','athlete_sports','attendance','coach_notes','performance_tests','staff_roles',
    'hp_students','hp_attendance','hp_test_results','hp_audit_log','hp_access_codes',
    'gym_checkins','workout_logs','athlete_events','athlete_status_history',
    'development_plans','development_goals','session_load',
    'rtp_stages','rtp_cases','rtp_case_progress',
    'player_profiles','push_subscriptions','urgent_alerts','audit_log','schools',
    'portal_access_codes','school_sports'
  )
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relrowsecurity ASC, count(p.polname) ASC, c.relname;


-- ── CHECK C: THE REAL TEST — impersonate a user and see what they can read ───
-- Replace the email below with a real staff member, and the two school ids with
-- their school and any other school. `other_school` MUST be 0 on every row.
--
--   SET LOCAL ROLE authenticated;
--   SET LOCAL request.jwt.claims = '{"email":"REPLACE@example.com","role":"authenticated"}';
--
--   SELECT 'athletes' AS tbl,
--     count(*) FILTER (WHERE school_id = 'THEIR_SCHOOL_ID')  AS own,
--     count(*) FILTER (WHERE school_id = 'OTHER_SCHOOL_ID')  AS other_school
--   FROM athletes
--   UNION ALL SELECT 'hp_students',
--     count(*) FILTER (WHERE school_id = 'THEIR_SCHOOL_ID'),
--     count(*) FILTER (WHERE school_id = 'OTHER_SCHOOL_ID') FROM hp_students
--   UNION ALL SELECT 'hp_test_results',
--     count(*) FILTER (WHERE school_id = 'THEIR_SCHOOL_ID'),
--     count(*) FILTER (WHERE school_id = 'OTHER_SCHOOL_ID') FROM hp_test_results
--   UNION ALL SELECT 'attendance',
--     count(*) FILTER (WHERE school_id = 'THEIR_SCHOOL_ID'),
--     count(*) FILTER (WHERE school_id = 'OTHER_SCHOOL_ID') FROM attendance
--   UNION ALL SELECT 'coach_notes',
--     count(*) FILTER (WHERE school_id = 'THEIR_SCHOOL_ID'),
--     count(*) FILTER (WHERE school_id = 'OTHER_SCHOOL_ID') FROM coach_notes
--   UNION ALL SELECT 'performance_tests',
--     count(*) FILTER (WHERE school_id = 'THEIR_SCHOOL_ID'),
--     count(*) FILTER (WHERE school_id = 'OTHER_SCHOOL_ID') FROM performance_tests
--   UNION ALL SELECT 'athlete_events',
--     count(*) FILTER (WHERE school_id = 'THEIR_SCHOOL_ID'),
--     count(*) FILTER (WHERE school_id = 'OTHER_SCHOOL_ID') FROM athlete_events
--   UNION ALL SELECT 'rtp_cases',
--     count(*) FILTER (WHERE school_id = 'THEIR_SCHOOL_ID'),
--     count(*) FILTER (WHERE school_id = 'OTHER_SCHOOL_ID') FROM rtp_cases;


-- ── CHECK D: orphaned rows ───────────────────────────────────────────────────
-- Rows belonging to no school are invisible to scoped queries, or visible to
-- everyone. Either way, a bug. Expect 0 everywhere.
SELECT 'athletes' AS t, count(*) FILTER (WHERE school_id IS NULL) AS orphaned FROM athletes
UNION ALL SELECT 'attendance',        count(*) FILTER (WHERE school_id IS NULL) FROM attendance
UNION ALL SELECT 'coach_notes',       count(*) FILTER (WHERE school_id IS NULL) FROM coach_notes
UNION ALL SELECT 'performance_tests', count(*) FILTER (WHERE school_id IS NULL) FROM performance_tests
UNION ALL SELECT 'hp_students',       count(*) FILTER (WHERE school_id IS NULL) FROM hp_students
UNION ALL SELECT 'hp_test_results',   count(*) FILTER (WHERE school_id IS NULL) FROM hp_test_results
UNION ALL SELECT 'athlete_events',    count(*) FILTER (WHERE school_id IS NULL) FROM athlete_events
UNION ALL SELECT 'rtp_cases',         count(*) FILTER (WHERE school_id IS NULL) FROM rtp_cases
UNION ALL SELECT 'development_goals', count(*) FILTER (WHERE school_id IS NULL) FROM development_goals
UNION ALL SELECT 'session_load',      count(*) FILTER (WHERE school_id IS NULL) FROM session_load
ORDER BY 2 DESC;
