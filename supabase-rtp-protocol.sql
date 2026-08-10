-- ═══════════════════════════════════════════════════════════════════════════════
-- RETURN TO PLAY PROTOCOL
--
-- Built from a real school protocol (report → assess → medical management →
-- sport-specific testing → clearance → graduated return), but with the stages
-- stored as DATA rather than hardcoded, because every school runs this
-- differently and the personnel involved differ too.
--
-- Three tables:
--   rtp_stages        — each school's own protocol, ordered
--   rtp_cases         — one injury episode for one athlete
--   rtp_case_progress — the audit trail of moving through the stages
--
-- Scope boundary, deliberately: Altus coordinates the SPORT PARTICIPATION
-- workflow. It records THAT a doctor or physio gave clearance and when, so a
-- coach knows whether an athlete may train — it does not store diagnoses,
-- treatment notes or any other clinical record. That line matters both for
-- POPIA (health data) and because this is not medical software.
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. STAGES: each school's own protocol ────────────────────────────────────
CREATE TABLE IF NOT EXISTS rtp_stages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sport       text,                       -- null = applies to all sports
  stage_order int  NOT NULL,
  name        text NOT NULL,              -- 'Initial Assessment'
  description text,                       -- what happens at this stage
  owner_role  text,                       -- 'S&C Coach' | 'Physiotherapist' | 'Head of Sport'

  -- Gates. A stage can require medical sign-off before it may be passed, and
  -- can require the athlete to hit their baseline test scores.
  requires_medical_clearance boolean NOT NULL DEFAULT false,
  requires_baseline_tests    boolean NOT NULL DEFAULT false,

  -- What availability the athlete should hold while at this stage, so the rest
  -- of the app stays in step automatically.
  sets_availability text,                 -- Injured | Modified | Available
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, sport, stage_order)
);

-- ── 2. CASES: one injury episode ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rtp_cases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  athlete_id    uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,

  -- Coach's own words. Deliberately not a clinical taxonomy.
  injury_summary text NOT NULL,
  body_area      text,
  occurred_on    date,
  reported_on    date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Johannesburg')::date,

  current_stage_id uuid REFERENCES rtp_stages(id) ON DELETE SET NULL,
  status        text NOT NULL DEFAULT 'open',   -- open | cleared | abandoned

  -- Medical clearance: WHO and WHEN only. No diagnosis, no treatment detail.
  medical_cleared_on   date,
  medical_cleared_by   text,               -- 'Dr A. Patel' / 'Physio — J. Smith'
  medical_clearance_note text,             -- short practical note, e.g. 'no COD for 2 weeks'

  expected_return date,
  cleared_on      date,
  opened_by     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 3. PROGRESS: the audit trail through the stages ──────────────────────────
CREATE TABLE IF NOT EXISTS rtp_case_progress (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  case_id    uuid NOT NULL REFERENCES rtp_cases(id) ON DELETE CASCADE,
  stage_id   uuid REFERENCES rtp_stages(id) ON DELETE SET NULL,
  stage_name text NOT NULL,                -- copied, so history survives stage edits
  outcome    text NOT NULL,                -- entered | passed | failed
  note       text,

  -- Where a stage required baseline tests, what was actually recorded.
  test_results jsonb DEFAULT '{}'::jsonb,

  recorded_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rtp_stages_school   ON rtp_stages (school_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_rtp_cases_athlete   ON rtp_cases (athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rtp_cases_open      ON rtp_cases (school_id, status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_rtp_progress_case   ON rtp_case_progress (case_id, created_at);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE rtp_stages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtp_cases         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtp_case_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rtp_stages_staff" ON rtp_stages;
CREATE POLICY "rtp_stages_staff" ON rtp_stages FOR ALL TO authenticated
  USING (public.is_staff() AND school_id = public.current_staff_school_id())
  WITH CHECK (public.is_hoh_or_owner() AND school_id = public.current_staff_school_id());

DROP POLICY IF EXISTS "rtp_cases_staff" ON rtp_cases;
CREATE POLICY "rtp_cases_staff" ON rtp_cases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM athletes a WHERE a.id = rtp_cases.athlete_id
                 AND public.can_access_team(a.team, a.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM athletes a WHERE a.id = rtp_cases.athlete_id
                 AND public.can_access_team(a.team, a.school_id)));

DROP POLICY IF EXISTS "rtp_progress_staff" ON rtp_case_progress;
CREATE POLICY "rtp_progress_staff" ON rtp_case_progress FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM rtp_cases c JOIN athletes a ON a.id = c.athlete_id
                 WHERE c.id = rtp_case_progress.case_id AND public.can_access_team(a.team, a.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM rtp_cases c JOIN athletes a ON a.id = c.athlete_id
                 WHERE c.id = rtp_case_progress.case_id AND public.can_access_team(a.team, a.school_id)));

GRANT SELECT, INSERT, UPDATE, DELETE ON rtp_stages, rtp_cases, rtp_case_progress TO service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['rtp_stages','rtp_cases','rtp_case_progress'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_school_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_school_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_context()', t);
  END LOOP;
END $$;

-- ── Default protocol, seeded for every existing school ───────────────────────
-- Based on a working school protocol. Schools can edit, reorder or replace
-- these entirely — they are a starting point, not a fixed pathway.
INSERT INTO rtp_stages (school_id, stage_order, name, description, owner_role,
                        requires_medical_clearance, requires_baseline_tests, sets_availability)
SELECT s.id, v.ord, v.name, v.descr, v.owner, v.med, v.tests, v.avail
FROM schools s
CROSS JOIN (VALUES
  (1, 'Injury Reported',      'Athlete reports the injury to the S&C coach immediately.',                              'S&C Coach',        false, false, 'Injured'),
  (2, 'Initial Assessment',   'Severity assessed; decide whether referral to a doctor or physiotherapist is required.', 'S&C Coach',        false, false, 'Injured'),
  (3, 'Medical Management',   'Treatment and rehabilitation under a doctor, physiotherapist or biokineticist.',         'Physiotherapist',  false, false, 'Injured'),
  (4, 'Medical Clearance',    'Treatment complete and cleared to begin sport-specific testing.',                        'Physiotherapist',  true,  false, 'Modified'),
  (5, 'Sport-Specific Testing','Strength, running, agility and fitness assessed against the athlete''s own baselines.', 'S&C Coach',        false, true,  'Modified'),
  (6, 'Graduated Return',     'Returns to full team training. Limit initial match exposure (e.g. one half).',           'Head Coach',       false, false, 'Modified'),
  (7, 'Full Return',          'Cleared for full training and full match participation.',                                'Head Coach',       false, false, 'Available')
) AS v(ord, name, descr, owner, med, tests, avail)
ON CONFLICT (school_id, sport, stage_order) DO NOTHING;

NOTIFY pgrst, 'reload schema';

SELECT s.name AS school, count(st.id) AS stages
FROM schools s LEFT JOIN rtp_stages st ON st.school_id = s.id
GROUP BY s.name ORDER BY s.name;
