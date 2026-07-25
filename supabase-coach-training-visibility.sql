-- ═══════════════════════════════════════════════════════════════════════════════
-- COACH VISIBILITY: let staff READ gym check-ins and workout logs for athletes
-- on teams they can access. Both tables were server-API-only, which is why the
-- coach-side athlete profile couldn't show any of this data. Write access stays
-- server-only (players log via the API; coaches never write these directly).
-- Scoping mirrors the athletes table's own can_access_team() policy exactly.
-- Safe to run multiple times. Run AFTER supabase-workout-tracking.sql.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "gym_checkins_staff_read" ON gym_checkins;
CREATE POLICY "gym_checkins_staff_read" ON gym_checkins
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM athletes a
    WHERE a.id = gym_checkins.athlete_id AND public.can_access_team(a.team)
  ));

DROP POLICY IF EXISTS "workout_logs_staff_read" ON workout_logs;
CREATE POLICY "workout_logs_staff_read" ON workout_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM athletes a
    WHERE a.id = workout_logs.athlete_id AND public.can_access_team(a.team)
  ));

NOTIFY pgrst, 'reload schema';
