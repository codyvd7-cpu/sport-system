-- ═══════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANCY — PART 5: PARENT PORTAL PER SCHOOL
--
-- The portal_access_codes table already exists (created in part 1). This
-- seeds it from the current env-var codes so existing parent access keeps
-- working, mapped to School 1.
--
-- Why this matters: the portal pages currently query Supabase directly from
-- the browser, and portal_* tables have `public read USING (true)`. That's
-- correct for a single school, but the moment School 2 exists, every parent
-- would see every school's fixtures and results mixed together. The app-side
-- fix (a server route that scopes by the signed cookie) is what actually
-- closes this — this file just gets the codes into the database so the
-- server has something to resolve a school from.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Seed School 1's codes. Replace the placeholder values below with the real
-- codes currently in your Vercel env vars (PORTAL_ACCESS_CODE, and the
-- per-sport ones) before running — or run it as-is and update the rows
-- afterwards from the table editor.
--
-- Codes are per (school, sport): the same school can run a different code for
-- hockey vs rugby, exactly as the env vars do today.

-- Codes are stored HASHED. Replace the placeholder strings below with your
-- real current portal codes — the digest is computed for you.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO portal_access_codes (school_id, sport, code_hash)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'hockey',    encode(digest(lower('REPLACE_ME_HOCKEY'),    'sha256'), 'hex')),
  ('00000000-0000-0000-0000-000000000001', 'rugby',     encode(digest(lower('REPLACE_ME_RUGBY'),     'sha256'), 'hex')),
  ('00000000-0000-0000-0000-000000000001', 'cricket',   encode(digest(lower('REPLACE_ME_CRICKET'),   'sha256'), 'hex')),
  ('00000000-0000-0000-0000-000000000001', 'rowing',    encode(digest(lower('REPLACE_ME_ROWING'),    'sha256'), 'hex')),
  ('00000000-0000-0000-0000-000000000001', 'swimming',  encode(digest(lower('REPLACE_ME_SWIMMING'),  'sha256'), 'hex')),
  ('00000000-0000-0000-0000-000000000001', 'waterpolo', encode(digest(lower('REPLACE_ME_WATERPOLO'), 'sha256'), 'hex'))
ON CONFLICT (school_id, sport) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────────────────
SELECT sport, left(code_hash, 12) || '…' AS code_hash_preview FROM portal_access_codes
WHERE school_id = '00000000-0000-0000-0000-000000000001'
ORDER BY sport;
