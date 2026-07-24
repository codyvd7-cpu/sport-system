-- ═══════════════════════════════════════════════════════════════════════════════
-- GYM CHECK-INS: raise the daily cap from 1 to 2 per athlete/venue/day.
-- (e.g. a morning gym session + an afternoon stretching session)
-- Drops the old UNIQUE(athlete_id, checkin_date, venue) constraint — the cap
-- is now enforced by the API counting today's rows instead, since "max 2" 
-- isn't expressible as a plain UNIQUE constraint. Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE gym_checkins DROP CONSTRAINT IF EXISTS gym_checkins_unique;
