-- ═══════════════════════════════════════════════════════════════════════════════
-- ATHLETE EVENTS — the athlete history spine
--
-- The problem this solves: the app records current STATE but not HISTORY.
-- `athletes.availability` is a single text field — change it and yesterday's
-- value is gone. So nothing can answer "what changed with this athlete over
-- the last six weeks?" without reconstructing it from overwritten values.
--
-- This table records meaningful athlete events as they happen. It does NOT
-- duplicate the existing tables: attendance rows, test results and coach notes
-- stay exactly where they are and remain the source of truth for their own
-- domain. This is a thin, append-only index of *notable moments* pointing back
-- at them — deliberately not an event-sourcing rewrite.
--
-- Purely additive. Nothing existing reads or depends on it, so this cannot
-- break current behaviour. Features are then layered on top:
--   • Athlete timeline (what happened, in order)
--   • Coach Inbox / What's Changed (recent events needing attention)
--   • IDP progress (goal set → intervention → retest → outcome)
--   • Return-to-play history (status changes over time, not just current)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS athlete_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  athlete_id  uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- What kind of thing happened. Kept as text rather than an enum so a new
  -- event type never requires a migration.
  --   availability_changed · injury_reported · injury_cleared
  --   test_completed · personal_best · attendance_concern
  --   note_added · goal_set · goal_achieved
  --   programme_assigned · programme_completed
  --   checkin · workout_logged · award
  event_type  text NOT NULL,

  -- Human-readable one-liner, written at the time so history stays truthful
  -- even if the underlying record is later edited or deleted.
  summary     text NOT NULL,

  -- Structured detail for anything a UI wants to render richly
  -- (e.g. {"test":"sprint_10m","from":2.01,"to":1.94,"unit":"s"}).
  detail      jsonb DEFAULT '{}'::jsonb,

  -- Optional pointer back to the row that caused this, so a timeline entry can
  -- deep-link. Intentionally NOT a foreign key: if the source row is deleted,
  -- the historical fact that it happened should survive.
  source_table text,
  source_id    uuid,

  -- Who caused it. Free text (staff email, 'player', 'system') rather than a
  -- FK, since players, staff and automated processes all write events.
  actor       text,

  -- Coaches care about the date the thing HAPPENED, which isn't always when
  -- it was recorded (attendance is often captured after the session).
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Timeline query: one athlete, newest first.
CREATE INDEX IF NOT EXISTS idx_athlete_events_athlete
  ON athlete_events (athlete_id, occurred_at DESC);

-- Coach Inbox query: what happened across this school recently.
CREATE INDEX IF NOT EXISTS idx_athlete_events_school_recent
  ON athlete_events (school_id, occurred_at DESC);

-- Filtering by kind (e.g. "show me PBs this term").
CREATE INDEX IF NOT EXISTS idx_athlete_events_type
  ON athlete_events (school_id, event_type, occurred_at DESC);

-- ── RLS: same team-scoped model as the athletes table ────────────────────────
-- A coach sees events for athletes on teams they can access, within their own
-- school. Read-only for clients; events are written server-side so they can't
-- be forged from a browser.
ALTER TABLE athlete_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "athlete_events_staff_read" ON athlete_events;
CREATE POLICY "athlete_events_staff_read" ON athlete_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM athletes a
    WHERE a.id = athlete_events.athlete_id
      AND public.can_access_team(a.team, a.school_id)
  ));

GRANT SELECT, INSERT ON athlete_events TO service_role;

-- ── Auto-fill school_id for any staff-session insert, matching every other
--    tenant table's behaviour ────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_set_school_id ON public.athlete_events;
CREATE TRIGGER trg_set_school_id BEFORE INSERT ON public.athlete_events
  FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_context();

NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────────────────
SELECT 'athlete_events created' AS status,
       (SELECT count(*) FROM information_schema.columns
        WHERE table_schema='public' AND table_name='athlete_events') AS columns,
       (SELECT count(*) FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid WHERE c.relname='athlete_events') AS policies;
