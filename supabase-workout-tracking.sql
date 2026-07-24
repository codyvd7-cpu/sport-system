-- ═══════════════════════════════════════════════════════════════════════════════
-- WORKOUT TRACKING — structured gym logging + light gamification.
-- Coaches define exercise lists per program; players log sets/reps/weight
-- against them; teammates see a weekly activity feed. Run in Supabase.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workout_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  team text,                    -- null = visible to all teams
  sport text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_program_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_sets int,
  target_reps text,             -- flexible: "8-10", "AMRAP", "30s hold" etc
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_program_exercises_program ON workout_program_exercises (program_id, sort_order);

CREATE TABLE IF NOT EXISTS workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  program_exercise_id uuid NOT NULL REFERENCES workout_program_exercises(id) ON DELETE CASCADE,
  sets int NOT NULL,
  reps int NOT NULL,
  weight_kg numeric,
  logged_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Johannesburg')::date,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workout_logs_athlete_date ON workout_logs (athlete_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise ON workout_logs (program_exercise_id);

-- RLS ─────────────────────────────────────────────────────────────────────────
-- Programs/exercises: public read (players need them to log against),
-- HOH/owner write (mirrors the existing portal_* staff-content pattern).
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_program_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workout_programs_public_read" ON workout_programs;
DROP POLICY IF EXISTS "workout_programs_staff_write" ON workout_programs;
CREATE POLICY "workout_programs_public_read" ON workout_programs FOR SELECT USING (true);
CREATE POLICY "workout_programs_staff_write" ON workout_programs
  FOR ALL TO authenticated USING (public.is_hoh_or_owner()) WITH CHECK (public.is_hoh_or_owner());

DROP POLICY IF EXISTS "workout_program_exercises_public_read" ON workout_program_exercises;
DROP POLICY IF EXISTS "workout_program_exercises_staff_write" ON workout_program_exercises;
CREATE POLICY "workout_program_exercises_public_read" ON workout_program_exercises FOR SELECT USING (true);
CREATE POLICY "workout_program_exercises_staff_write" ON workout_program_exercises
  FOR ALL TO authenticated USING (public.is_hoh_or_owner()) WITH CHECK (public.is_hoh_or_owner());

-- Logs: contain performance data players log about themselves and their
-- teammates can see via the team feed — locked to server-API access only
-- (like gym_checkins), same reasoning: trust and team-scoping are enforced
-- in the API layer, not via RLS row-matching on a browser client.
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON workout_programs, workout_program_exercises, workout_logs TO service_role;

NOTIFY pgrst, 'reload schema';
