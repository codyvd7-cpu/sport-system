-- ═══════════════════════════════════════════════════════════════════════════════
-- ATHLETE STATUS HISTORY + DEVELOPMENT PLANS + SESSION LOAD
--
-- Three related additions, deliberately built on what already exists rather
-- than as parallel systems:
--
--   1. athlete_status_history — Return-to-Play. The app already has a 4-state
--      availability field (Available / Modified / Injured / Resting) that
--      coaches use. RTP is not a new concept alongside it; it is that field
--      given HISTORY and STRUCTURE. This records each change with its reason
--      and expected return, so "who is due for review" becomes answerable.
--
--   2. development_plans + development_goals — Individual Development Plans.
--      Closes the loop the audit identified: TEST → GOAL → INTERVENTION →
--      RETEST → OUTCOME. Deliberately links to real test data rather than
--      free text, so progress is measured, not asserted.
--
--   3. session_load — Session RPE. Two fields (RPE × duration) giving a basic
--      internal load measure. Deliberately NOT a readiness score: the audit is
--      right that composite scores create false precision. This stores the
--      raw inputs; interpretation stays with the coach.
--
-- All additive. Nothing existing reads these, so current behaviour is
-- unchanged until the UI surfaces them.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. STATUS HISTORY (Return to Play) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_status_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  athlete_id    uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Matches the existing availability values exactly, so nothing has to be
  -- migrated or re-taught: Available | Modified | Injured | Resting
  status        text NOT NULL,
  previous_status text,

  -- Why. Free text on purpose — coaches describe injuries in their own words,
  -- and forcing a taxonomy here would push this toward clinical software,
  -- which the product deliberately is not.
  reason        text,

  -- Optional structured detail without becoming a medical record:
  --   body_area ('hamstring'), severity_note, restrictions ('no COD work')
  detail        jsonb DEFAULT '{}'::jsonb,

  -- What the coach expects, and when to look again. This is what makes
  -- "who needs a review today" answerable.
  expected_return date,
  review_date     date,

  changed_by    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_athlete ON athlete_status_history (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_review  ON athlete_status_history (school_id, review_date) WHERE review_date IS NOT NULL;

ALTER TABLE athlete_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "status_history_staff_read" ON athlete_status_history;
CREATE POLICY "status_history_staff_read" ON athlete_status_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM athletes a WHERE a.id = athlete_status_history.athlete_id
                 AND public.can_access_team(a.team, a.school_id)));
GRANT SELECT, INSERT ON athlete_status_history TO service_role;


-- ── 2. DEVELOPMENT PLANS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS development_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  athlete_id  uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  title       text NOT NULL,
  period      text,                                   -- 'Term 3 2026', 'Pre-season'
  status      text NOT NULL DEFAULT 'active',         -- active | completed | archived
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS development_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id     uuid NOT NULL REFERENCES development_plans(id) ON DELETE CASCADE,
  athlete_id  uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- physical | technical | tactical | psychological
  category    text NOT NULL DEFAULT 'physical',
  goal        text NOT NULL,                          -- "Improve first-step acceleration"

  -- The closed loop. These link to real measurements rather than free text,
  -- so "did it work?" is answered by data instead of opinion.
  test_key      text,                                 -- e.g. 'sprint_10m'
  baseline_value numeric,
  target_value   numeric,
  latest_value   numeric,
  unit           text,

  intervention text,                                  -- "Acceleration programme assigned"
  review_date  date,
  status       text NOT NULL DEFAULT 'active',        -- active | achieved | missed | abandoned
  outcome_note text,

  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  achieved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dev_plans_athlete ON development_plans (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_goals_plan    ON development_goals (plan_id);
CREATE INDEX IF NOT EXISTS idx_dev_goals_athlete ON development_goals (athlete_id, status);
CREATE INDEX IF NOT EXISTS idx_dev_goals_review  ON development_goals (school_id, review_date) WHERE status = 'active';

ALTER TABLE development_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_plans_staff_all" ON development_plans;
CREATE POLICY "dev_plans_staff_all" ON development_plans
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM athletes a WHERE a.id = development_plans.athlete_id
                 AND public.can_access_team(a.team, a.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM athletes a WHERE a.id = development_plans.athlete_id
                 AND public.can_access_team(a.team, a.school_id)));

DROP POLICY IF EXISTS "dev_goals_staff_all" ON development_goals;
CREATE POLICY "dev_goals_staff_all" ON development_goals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM athletes a WHERE a.id = development_goals.athlete_id
                 AND public.can_access_team(a.team, a.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM athletes a WHERE a.id = development_goals.athlete_id
                 AND public.can_access_team(a.team, a.school_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON development_plans, development_goals TO service_role;


-- ── 3. SESSION LOAD (RPE) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_load (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  athlete_id   uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Johannesburg')::date,
  session_type text,                                  -- 'Training' | 'Match' | 'Gym'

  rpe          int NOT NULL CHECK (rpe BETWEEN 1 AND 10),
  duration_min int NOT NULL CHECK (duration_min > 0),

  -- Stored rather than computed on read so historical loads stay correct even
  -- if the formula is ever revisited. This is RPE × minutes — a standard,
  -- well-understood measure, NOT a proprietary "readiness score".
  load_au      int GENERATED ALWAYS AS (rpe * duration_min) STORED,

  note         text,
  recorded_by  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, session_date, session_type)
);

CREATE INDEX IF NOT EXISTS idx_session_load_athlete ON session_load (athlete_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_session_load_school  ON session_load (school_id, session_date DESC);

ALTER TABLE session_load ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "session_load_staff_all" ON session_load;
CREATE POLICY "session_load_staff_all" ON session_load
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM athletes a WHERE a.id = session_load.athlete_id
                 AND public.can_access_team(a.team, a.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM athletes a WHERE a.id = session_load.athlete_id
                 AND public.can_access_team(a.team, a.school_id)));
GRANT SELECT, INSERT, UPDATE ON session_load TO service_role;


-- ── Auto-fill school_id on all four, matching every other tenant table ───────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['athlete_status_history','development_plans','development_goals','session_load'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_school_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_school_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_context()', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────────────────
SELECT c.relname AS table_name, c.relrowsecurity AS rls, count(p.polname) AS policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname='public' AND c.relname IN
  ('athlete_status_history','development_plans','development_goals','session_load')
GROUP BY c.relname, c.relrowsecurity ORDER BY c.relname;
