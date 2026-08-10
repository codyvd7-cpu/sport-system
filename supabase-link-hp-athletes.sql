-- ═══════════════════════════════════════════════════════════════════════════════
-- LINK HP STUDENTS TO ATHLETES — one person, one development record
--
-- The problem: testing lives in two places. hp_students (the real testing
-- battery: sprints, jumps, agility, Yo-Yo) and athletes (teams, attendance,
-- fixtures, notes). They are the same young people, recorded twice, with no
-- connection between them. So an athlete's profile cannot show their actual
-- test results, and a retest list can only ever cover half the picture.
--
-- The approach: an explicit athlete_id on hp_students, set deliberately rather
-- than inferred. Names are NOT used as the join at runtime — they change,
-- duplicate ("J. Smith" twice in a grade), and get typed inconsistently.
-- Name similarity is only ever a SUGGESTION for a human to confirm.
--
-- Nullable throughout: an HP student who is not on a team, or an athlete who
-- does not do HP testing, both remain perfectly valid. This adds a connection
-- where one exists; it does not force every record to pair up.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE hp_students ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES athletes(id) ON DELETE SET NULL;

-- One athlete should not be linked to two HP student records.
CREATE UNIQUE INDEX IF NOT EXISTS idx_hp_students_athlete_unique
  ON hp_students (athlete_id) WHERE athlete_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hp_students_athlete ON hp_students (athlete_id);

-- Records how each link was made, so a wrong match can be found and undone
-- later rather than becoming invisible history.
ALTER TABLE hp_students ADD COLUMN IF NOT EXISTS link_method text;   -- 'manual' | 'suggested_confirmed' | 'import'
ALTER TABLE hp_students ADD COLUMN IF NOT EXISTS linked_at timestamptz;
ALTER TABLE hp_students ADD COLUMN IF NOT EXISTS linked_by text;

NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────────────────
SELECT
  s.name AS school,
  (SELECT count(*) FROM hp_students h WHERE h.school_id = s.id) AS hp_students,
  (SELECT count(*) FROM hp_students h WHERE h.school_id = s.id AND h.athlete_id IS NOT NULL) AS linked,
  (SELECT count(*) FROM athletes a WHERE a.school_id = s.id) AS athletes
FROM schools s ORDER BY s.name;
