-- ═══════════════════════════════════════════════════════════════════════════════
-- WORKOUT PROGRAMS: target by age category (Junior/Senior) instead of exact
-- squad name. The team-name match failed in practice — a program set to
-- "Opens" never matched an athlete whose team was "3rds" etc. Age category is
-- what coaches actually think in terms of for training programs.
--
-- Junior = U14. Senior/Opens = U16, U18, U19, U21, Senior (i.e. "16 and up").
-- Adjust the CASE mapping below if that split isn't quite right.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE workout_programs ADD COLUMN IF NOT EXISTS age_category text; -- 'junior' | 'senior' | null (= all)

-- Auto-migrate any existing programs so nothing has to be recreated
UPDATE workout_programs
SET age_category = CASE
  WHEN team ILIKE '%junior%' THEN 'junior'
  WHEN team ILIKE '%open%' OR team ILIKE '%senior%' THEN 'senior'
  ELSE age_category
END
WHERE age_category IS NULL;

NOTIFY pgrst, 'reload schema';
