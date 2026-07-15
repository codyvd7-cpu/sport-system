-- ═══════════════════════════════════════════════════════════════════════════════
-- HP DATA INTEGRITY MIGRATION — run in Supabase SQL editor BEFORE deploying
-- the updated hpRepository. Safe to run multiple times.
--
-- What this does:
--   1. Removes any duplicate rows (kept: highest id as arbitrary tiebreaker —
--      duplicates are identical anyway because saves were delete-then-insert)
--   2. Adds unique constraints so saves become ATOMIC UPSERTS instead of
--      delete-then-insert (which could lose data if the insert failed)
--   3. Adds indexes for fast historical look-back queries
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Dedup (no-op if clean) ─────────────────────────────────────────────────
DELETE FROM hp_test_results a
  USING hp_test_results b
  WHERE a.id < b.id
    AND a.student_id = b.student_id
    AND a.year = b.year
    AND a.term = b.term;

DELETE FROM hp_attendance a
  USING hp_attendance b
  WHERE a.id < b.id
    AND a.student_id = b.student_id
    AND a.session_date = b.session_date;

-- ── 2. Unique constraints (enable atomic upserts) ─────────────────────────────
DO $$ BEGIN
  ALTER TABLE hp_test_results
    ADD CONSTRAINT hp_test_results_unique UNIQUE (student_id, year, term);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE hp_attendance
    ADD CONSTRAINT hp_attendance_unique UNIQUE (student_id, session_date);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- ── 3. Look-back indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hp_tests_year_term  ON hp_test_results (year, term);
CREATE INDEX IF NOT EXISTS idx_hp_tests_student    ON hp_test_results (student_id);
CREATE INDEX IF NOT EXISTS idx_hp_att_date         ON hp_attendance (session_date DESC);
CREATE INDEX IF NOT EXISTS idx_hp_att_student      ON hp_attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_hp_audit_created    ON hp_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hp_audit_action     ON hp_audit_log (action);
