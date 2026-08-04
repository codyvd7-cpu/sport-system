-- ═══════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANCY — PART 3: AUTO-POPULATE school_id ON STAFF-CREATED ROWS
--
-- The RLS policies we just turned on require every row to carry the right
-- school_id — but nothing in the app sets it yet. For anything created
-- through a signed-in staff member's own browser session (portal-admin's
-- fixtures/results/reminders/etc, and the coach-side athletes/attendance/
-- performance/notes pages), this trigger fills it in automatically from
-- whichever school that staff member belongs to. Zero app code changes
-- needed for any of these — this is the fix for "creating things in
-- portal-admin is failing right now."
--
-- This does NOT cover routes that write via the service-role key (player
-- check-ins, workout logging, HP module, inviting a coach) — those bypass
-- RLS entirely and have no "logged-in browser session" for this trigger to
-- read, so they need an explicit code fix instead. That's the next piece,
-- not covered by this file.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_school_id_from_context()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    NEW.school_id := public.current_staff_school_id();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  staff_driven_tables text[] := ARRAY[
    'athletes', 'athlete_sports', 'attendance', 'coach_notes', 'performance_tests',
    'portal_fixtures', 'portal_results', 'portal_reminders', 'portal_programs',
    'portal_sponsors', 'portal_spotlight', 'portal_week_plans', 'portal_week_plan_items',
    'workout_programs', 'workout_program_exercises'
  ];
BEGIN
  FOREACH t IN ARRAY staff_driven_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_school_id ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_school_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_context()',
      t
    );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- ── VERIFY: every table above should now show 1 trigger each ─────────────────
SELECT event_object_table, trigger_name
FROM information_schema.triggers
WHERE trigger_name = 'trg_set_school_id'
ORDER BY event_object_table;
