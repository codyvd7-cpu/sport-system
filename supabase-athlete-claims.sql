-- ═══════════════════════════════════════════════════════════════════════════════
-- ATHLETE CLAIM VERIFICATION
--
-- The problem being fixed: a player or parent could link their account to ANY
-- athlete record with no verification at all. One search, one tap, and they saw
-- that child's attendance, test results, coach notes and photograph. The search
-- wasn't even school-scoped, so School A's users could find School B's children.
--
-- The approach:
--   • A link becomes a CLAIM that must be approved, not an instant action.
--   • Auto-approved when the sign-up email matches the parent email already on
--     the athlete record — most families never wait, and the school already
--     holds that email, so it's real evidence rather than a shared secret.
--   • Otherwise a coach approves it. The coach already knows whether that's
--     really this child's parent; no new infrastructure, no codes to distribute
--     and lose.
--   • Multiple claims per athlete are allowed (a player AND a parent both
--     legitimately want access) but every claim is visible, so an unexpected
--     third claim is noticeable.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS athlete_claims (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  athlete_id  uuid NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  email       text NOT NULL,

  -- 'player' | 'parent' — affects nothing yet, but a parent and a player may
  -- eventually see different things, and capturing it now costs nothing.
  claim_type  text NOT NULL DEFAULT 'player',

  status      text NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  -- How it was approved, so an audit can tell automatic from human decisions
  approved_via text,                             -- 'parent_email_match' | 'coach'
  approved_by  text,
  approved_at  timestamptz,
  rejected_reason text,

  created_at  timestamptz NOT NULL DEFAULT now(),

  -- One claim per user per athlete. Re-requesting updates the existing row
  -- rather than stacking duplicates.
  UNIQUE (athlete_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_claims_pending ON athlete_claims (school_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_claims_athlete ON athlete_claims (athlete_id);
CREATE INDEX IF NOT EXISTS idx_claims_user    ON athlete_claims (user_id);

-- Server-API only. Players interact through /api/player/*, coaches through
-- /api/coach/claims — neither queries this table directly from a browser.
ALTER TABLE athlete_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "claims_staff_read" ON athlete_claims;
CREATE POLICY "claims_staff_read" ON athlete_claims
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM athletes a WHERE a.id = athlete_claims.athlete_id
                 AND public.can_access_team(a.team, a.school_id)));

GRANT SELECT, INSERT, UPDATE ON athlete_claims TO service_role;

DROP TRIGGER IF EXISTS trg_set_school_id ON public.athlete_claims;
CREATE TRIGGER trg_set_school_id BEFORE INSERT ON public.athlete_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_context();

-- Existing links predate verification. Rather than trusting them silently or
-- cutting families off without warning, record them as claims needing review.
INSERT INTO athlete_claims (school_id, athlete_id, user_id, email, status, claim_type)
SELECT p.school_id, p.athlete_id, p.user_id, COALESCE(p.full_name, 'unknown'), 'pending', 'player'
FROM player_profiles p
WHERE p.athlete_id IS NOT NULL AND p.school_id IS NOT NULL
ON CONFLICT (athlete_id, user_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

SELECT 'athlete_claims created' AS status,
       (SELECT count(*) FROM athlete_claims) AS migrated_existing_links;
