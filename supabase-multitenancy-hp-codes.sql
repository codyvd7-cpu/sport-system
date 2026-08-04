-- ═══════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANCY — PART 4: HP MODULE ACCESS CODES PER SCHOOL
--
-- The problem: HP auth is a single shared access code in an env var
-- (HP_ACCESS_CODE / HP_ADMIN_ACCESS_CODE). There's no user account behind it,
-- so unlike every other part of the app, there is no logged-in person whose
-- school we can look up. One code, one school — it can't scale past school #1.
--
-- The fix: same pattern the schema already uses for portal_access_codes —
-- move the codes into a table where each row maps a code to a school. The
-- code itself then tells us which school the session belongs to, and that
-- school_id gets baked into the signed session cookie at login.
--
-- Backwards compatible: the existing env-var codes keep working and resolve
-- to School 1, so nothing breaks the moment this runs. New schools get rows
-- in this table instead of new env vars.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS hp_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  code text NOT NULL,
  role text NOT NULL DEFAULT 'hp-coach',   -- 'hp-coach' | 'hp-admin'
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_hp_access_codes_school ON hp_access_codes (school_id);

-- Server-API only: the login route reads this with the service-role key.
-- No client ever queries it directly, so RLS on with no policies is correct.
ALTER TABLE hp_access_codes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON hp_access_codes TO service_role;

NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────────────────
SELECT 'hp_access_codes created' AS status,
       (SELECT count(*) FROM hp_access_codes) AS existing_codes;
