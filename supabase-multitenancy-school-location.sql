-- ═══════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANCY — PART 6: PER-SCHOOL WEATHER LOCATION
--
-- Fixture-day weather was pinned to one set of coordinates (Bedfordview), so
-- every school would have seen School 1's forecast on their fixture cards.
-- These columns let each school carry its own location.
--
-- Defaults are Johannesburg — sensible for a South African rollout, and
-- meaningfully better than showing another school's weather while a new
-- school's real coordinates haven't been set yet.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE schools ADD COLUMN IF NOT EXISTS latitude  numeric DEFAULT -26.2041;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS longitude numeric DEFAULT 28.0473;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS timezone  text    DEFAULT 'Africa/Johannesburg';

-- School 1 keeps its actual Bedfordview coordinates.
UPDATE schools
SET latitude = -26.17, longitude = 28.14
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND latitude IS NULL;

NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────────────────
SELECT name, latitude, longitude, timezone FROM schools ORDER BY name;
