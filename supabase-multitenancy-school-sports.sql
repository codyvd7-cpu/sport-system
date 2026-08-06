-- ═══════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANCY — PART 7: SPORTS PER SCHOOL
--
-- Until now the sport list was a hardcoded constant in lib/sports.ts, so every
-- school saw all seven sports whether they offered them or not — a hockey-and-
-- cricket school still got rowing and water polo in their navigation, and a
-- school offering netball or athletics had no way to add it.
--
-- This table records which sports each school actually runs. The app reads
-- from it instead of showing the global list to everyone.
--
-- sport_key still refers to the definitions in lib/sports.ts (labels, icons,
-- terminology like "Crew" vs "Team"), so this controls *which* sports appear,
-- not how each one behaves. Adding a genuinely new sport type still needs a
-- code change — that's a deliberate limit, since each sport carries its own
-- vocabulary and structure.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS school_sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sport_key text NOT NULL,          -- 'hockey' | 'rugby' | ... (see lib/sports.ts)
  display_name text,                -- optional override, e.g. "1st XI Hockey Programme"
  color_override text,              -- optional: school's own colour for this sport
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (school_id, sport_key)
);

CREATE INDEX IF NOT EXISTS idx_school_sports_school ON school_sports (school_id, sort_order);

-- Public read: the portal needs the sport list before anyone signs in.
-- Staff write is restricted to heads of sport / owners of that same school.
ALTER TABLE school_sports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_sports_public_read" ON school_sports;
DROP POLICY IF EXISTS "school_sports_staff_write" ON school_sports;

CREATE POLICY "school_sports_public_read" ON school_sports
  FOR SELECT USING (true);
CREATE POLICY "school_sports_staff_write" ON school_sports
  FOR ALL TO authenticated
  USING (public.is_hoh_or_owner() AND school_id = public.current_staff_school_id())
  WITH CHECK (public.is_hoh_or_owner() AND school_id = public.current_staff_school_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON school_sports TO service_role;

-- Backfill: give the existing school every sport that actually has data, so
-- nothing disappears from their navigation the moment this goes live.
INSERT INTO school_sports (school_id, sport_key, sort_order)
SELECT DISTINCT s.id, x.sport_key, x.ord
FROM schools s
CROSS JOIN (VALUES
  ('hockey', 1), ('rugby', 2), ('cricket', 3), ('swimming', 4),
  ('rowing', 5), ('waterpolo', 6), ('football', 7)
) AS x(sport_key, ord)
WHERE s.id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (school_id, sport_key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────────────────
SELECT sc.name AS school, ss.sport_key, ss.sort_order, ss.is_active
FROM school_sports ss JOIN schools sc ON sc.id = ss.school_id
ORDER BY sc.name, ss.sort_order;
