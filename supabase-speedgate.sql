-- ═══════════════════════════════════════════════════════════════════════════════
-- SPEEDGATE — TIMED SPRINT ATTEMPTS
--
-- The problem this solves: performance_tests carries
--   UNIQUE (athlete_id, test_date, test_type)
-- so it holds exactly ONE row per athlete per test per day. Sprint testing is
-- inherently multi-attempt — a coach runs each athlete two or three times and
-- keeps the best. Saving attempts into performance_tests would either be
-- rejected outright or silently overwrite the earlier attempts.
--
-- The approach: attempts live in their own table; the best attempt of a
-- session is promoted into performance_tests exactly as a manual entry would
-- be. Every existing PB, trend and profile query keeps working untouched,
-- because as far as they're concerned nothing has changed.
--
--   speedtest_attempts   every run, including failed and invalid ones
--   performance_tests    the athlete's best result — unchanged shape
--
-- Timing precision: elapsed time is stored as INTEGER MILLISECONDS, which is
-- the canonical value the hardware reports. Converting to seconds happens at
-- display time only — storing 4.29 would permanently discard precision the
-- gates actually measured.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS speedtest_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  athlete_id  uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Groups the attempts a coach recorded in one field session, so the UI can
  -- show "today's attempts" and pick a best without guessing by timestamp.
  session_id  uuid NOT NULL,

  test_type   text NOT NULL,              -- 'sprint_30m' etc — matches performance_tests.test_type
  distance_m  numeric NOT NULL,
  attempt_no  int NOT NULL DEFAULT 1,

  -- Canonical result, exactly as the hardware measured it.
  elapsed_ms  int,                        -- null for DNS/DNF/invalid

  -- valid | invalid | dns | dnf — a coach must be able to void a bad run
  -- (false trigger, athlete stumbled) without deleting the evidence it happened.
  status      text NOT NULL DEFAULT 'valid',
  void_reason text,

  -- ── Provenance and idempotency ──────────────────────────────────────────
  -- 'speedgate' | 'manual'. Manual entry remains fully supported; the
  -- hardware augments testing rather than replacing it.
  source      text NOT NULL DEFAULT 'speedgate',

  -- The hardware's own run counter. BLE notifications can arrive more than
  -- once (retransmit, reconnect replay), so this is what makes a duplicate
  -- physically impossible to store rather than merely unlikely — see the
  -- unique index below.
  hardware_run_id int,
  device_name     text,
  firmware_version text,
  protocol_version int,

  recorded_by text,
  test_date   date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Johannesburg')::date,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CHECK (status IN ('valid', 'invalid', 'dns', 'dnf')),
  CHECK (elapsed_ms IS NULL OR elapsed_ms > 0),
  CHECK (distance_m > 0 AND distance_m <= 500)
);

-- IDEMPOTENCY. The same hardware run can only ever produce one stored row per
-- session, enforced by the database rather than by application logic — a
-- duplicate BLE notification hits this constraint and is rejected outright.
CREATE UNIQUE INDEX IF NOT EXISTS idx_speedtest_run_unique
  ON speedtest_attempts (session_id, hardware_run_id)
  WHERE hardware_run_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_speedtest_athlete ON speedtest_attempts (athlete_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_speedtest_session ON speedtest_attempts (session_id, attempt_no);
CREATE INDEX IF NOT EXISTS idx_speedtest_school  ON speedtest_attempts (school_id, test_date DESC);

-- ── RLS: same team-scoped model as every other athlete-adjacent table ───────
ALTER TABLE speedtest_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "speedtest_staff" ON speedtest_attempts;
CREATE POLICY "speedtest_staff" ON speedtest_attempts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM athletes a WHERE a.id = speedtest_attempts.athlete_id
                 AND public.can_access_team(a.team, a.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM athletes a WHERE a.id = speedtest_attempts.athlete_id
                 AND public.can_access_team(a.team, a.school_id)));

GRANT SELECT, INSERT, UPDATE ON speedtest_attempts TO service_role;

DROP TRIGGER IF EXISTS trg_set_school_id ON public.speedtest_attempts;
CREATE TRIGGER trg_set_school_id BEFORE INSERT ON public.speedtest_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_context();

-- ── Provenance on the existing results table ────────────────────────────────
-- Additive and nullable, so every existing row and every existing query is
-- unaffected. Lets the athlete profile show where a result came from.
ALTER TABLE performance_tests ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE performance_tests ADD COLUMN IF NOT EXISTS distance_m numeric;
ALTER TABLE performance_tests ADD COLUMN IF NOT EXISTS elapsed_ms int;

NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────────────────
SELECT 'speedtest_attempts' AS table_name,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='speedtest_attempts') AS columns,
  (SELECT count(*) FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
     WHERE c.relname='speedtest_attempts') AS policies,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema='public' AND table_name='performance_tests'
       AND column_name IN ('source','distance_m','elapsed_ms')) AS new_provenance_cols;
