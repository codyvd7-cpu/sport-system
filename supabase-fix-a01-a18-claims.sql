-- ═══════════════════════════════════════════════════════════════════════════════
-- ATHLETE_CLAIMS — fixes for A01 (critical) and A18 (high)
--
-- A01: complete-invite had no server-owned record to check against, so it
-- fell back to trusting client-supplied data. The fix in the API route needs
-- a claim row with a genuine 'pending_activation' state and an expiry — this
-- migration adds what that fix depends on.
--
-- A18: every unconsumed invite was upserted with the SAME placeholder UUID
-- (00000000-0000-0000-0000-000000000000), because the real user doesn't exist
-- yet at invite-send time. UNIQUE(athlete_id, user_id) means a second invite
-- for a DIFFERENT athlete, sent before the first was activated, would upsert
-- onto the same row instead of creating a new one — silently overwriting the
-- first child's pending invitation.
--
-- Fix: invitations get their own identity (a random invite_token) rather than
-- sharing a placeholder user_id. Uniqueness moves to (athlete_id, email) for
-- the pending state, which is what should have been unique all along — one
-- pending invite per athlete per email address, not per fake shared user.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE athlete_claims ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE athlete_claims ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid();

-- user_id must be nullable now: a pending_activation row has no real user yet.
-- The old placeholder-UUID convention is what caused the collision.
ALTER TABLE athlete_claims ALTER COLUMN user_id DROP NOT NULL;

-- Drop the constraint that caused unrelated invitations to collide.
ALTER TABLE athlete_claims DROP CONSTRAINT IF EXISTS athlete_claims_athlete_id_user_id_key;

-- One approved/active relationship per real user per athlete (unaffected by
-- pending rows, since user_id is null until activation).
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_user_athlete
  ON athlete_claims (athlete_id, user_id) WHERE user_id IS NOT NULL;

-- One live pending invite per athlete per email — a coach re-inviting the
-- same parent updates the existing pending row rather than creating a
-- duplicate that could later collide on activation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_claims_pending_email
  ON athlete_claims (athlete_id, email) WHERE status = 'pending_activation';

ALTER TABLE athlete_claims DROP CONSTRAINT IF EXISTS athlete_claims_status_check;
ALTER TABLE athlete_claims ADD CONSTRAINT athlete_claims_status_check
  CHECK (status IN ('pending_activation', 'pending', 'approved', 'rejected'));

NOTIFY pgrst, 'reload schema';

SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='athlete_claims'
  AND column_name IN ('expires_at', 'invite_token');
