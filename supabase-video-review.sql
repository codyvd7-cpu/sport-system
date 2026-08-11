-- ═══════════════════════════════════════════════════════════════════════════════
-- VIDEO REVIEW — tagging, clipping, and attaching video to athletes
--
-- Deliberately link-based to start. Schools already film with something
-- (YouTube, Veo, Vimeo); we store the tags and timestamps, they host the
-- pixels. Hosting video ourselves would cost roughly $36/month per school in
-- bandwidth alone once coaches actually watch it, and every replay adds more.
--
-- The important design property: TAGS ARE JUST TIMESTAMPS. Nothing here
-- depends on where the file lives, so moving to hosted video later (Cloudflare
-- Stream, Mux) changes one column and breaks nothing.
--
-- Four tables:
--   video_tag_types — each school defines its own tag set + hotkeys
--   videos          — one match or session
--   video_tags      — a moment, with an optional athlete attached
--   video_clips     — a named in/out range, built from tags or by hand
-- ═══════════════════════════════════════════════════════════════════════════════


-- ── 1. TAG TYPES: defined per school, not hardcoded ──────────────────────────
CREATE TABLE IF NOT EXISTS video_tag_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  sport      text,                       -- null = all sports at this school
  label      text NOT NULL,              -- 'Goal', 'Penalty Corner', 'Turnover'
  hotkey     text,                       -- single character; what makes live tagging fast
  color      text NOT NULL DEFAULT '#38bdf8',
  sort_order int  NOT NULL DEFAULT 0,

  -- Seconds captured before and after the tapped moment. A goal needs the
  -- build-up; a turnover needs what happened next.
  lead_seconds  int NOT NULL DEFAULT 8,
  trail_seconds int NOT NULL DEFAULT 4,

  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, sport, label)
);

-- ── 2. VIDEOS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

  title       text NOT NULL,
  team        text,
  sport       text,
  opponent    text,
  played_on   date,

  -- Where the video lives. 'youtube' today; 'stream' or 'upload' later without
  -- any change to tags or clips.
  provider    text NOT NULL DEFAULT 'youtube',
  external_id text,                      -- YouTube video id
  url         text,                      -- original pasted link, kept for reference
  duration_seconds int,

  -- Players and parents see nothing by default. Sharing is an explicit act.
  is_shared   boolean NOT NULL DEFAULT false,

  notes       text,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 3. TAGS: a single moment ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_tags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  video_id     uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  tag_type_id  uuid REFERENCES video_tag_types(id) ON DELETE SET NULL,

  -- Copied at tag time so history survives a tag type being renamed or deleted
  label        text NOT NULL,
  color        text,

  timestamp_seconds numeric NOT NULL,
  athlete_id   uuid REFERENCES athletes(id) ON DELETE SET NULL,
  note         text,

  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── 4. CLIPS: a named range ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video_clips (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,

  title       text NOT NULL,
  start_seconds numeric NOT NULL,
  end_seconds   numeric NOT NULL,

  athlete_id  uuid REFERENCES athletes(id) ON DELETE SET NULL,
  -- Ties a clip to a development goal, closing the loop between what a coach
  -- says and what the athlete can actually watch
  goal_id     uuid REFERENCES development_goals(id) ON DELETE SET NULL,

  coach_note  text,
  -- Per-clip visibility: a coach may share one clip from an otherwise private
  -- match without exposing the whole video
  visible_to_player boolean NOT NULL DEFAULT false,

  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_seconds > start_seconds)
);

CREATE INDEX IF NOT EXISTS idx_videos_school   ON videos (school_id, played_on DESC);
CREATE INDEX IF NOT EXISTS idx_videos_team     ON videos (school_id, team);
CREATE INDEX IF NOT EXISTS idx_tags_video      ON video_tags (video_id, timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_tags_athlete    ON video_tags (athlete_id) WHERE athlete_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clips_video     ON video_clips (video_id, start_seconds);
CREATE INDEX IF NOT EXISTS idx_clips_athlete   ON video_clips (athlete_id) WHERE athlete_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tagtypes_school ON video_tag_types (school_id, sort_order);

-- ── RLS: team-scoped, same model as every other athlete-adjacent table ───────
ALTER TABLE video_tag_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_tags      ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_clips     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "video_tag_types_staff" ON video_tag_types;
CREATE POLICY "video_tag_types_staff" ON video_tag_types FOR ALL TO authenticated
  USING (public.is_staff() AND school_id = public.current_staff_school_id())
  WITH CHECK (public.is_hoh_or_owner() AND school_id = public.current_staff_school_id());

DROP POLICY IF EXISTS "videos_staff" ON videos;
CREATE POLICY "videos_staff" ON videos FOR ALL TO authenticated
  USING (public.is_staff() AND school_id = public.current_staff_school_id())
  WITH CHECK (public.is_staff() AND school_id = public.current_staff_school_id());

DROP POLICY IF EXISTS "video_tags_staff" ON video_tags;
CREATE POLICY "video_tags_staff" ON video_tags FOR ALL TO authenticated
  USING (public.is_staff() AND school_id = public.current_staff_school_id())
  WITH CHECK (public.is_staff() AND school_id = public.current_staff_school_id());

DROP POLICY IF EXISTS "video_clips_staff" ON video_clips;
CREATE POLICY "video_clips_staff" ON video_clips FOR ALL TO authenticated
  USING (public.is_staff() AND school_id = public.current_staff_school_id())
  WITH CHECK (public.is_staff() AND school_id = public.current_staff_school_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON video_tag_types, videos, video_tags, video_clips TO service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['video_tag_types','videos','video_tags','video_clips'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_school_id ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_set_school_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_school_id_from_context()', t);
  END LOOP;
END $$;

-- ── Starter tag set per school ───────────────────────────────────────────────
-- Hockey-flavoured defaults because that's where these schools start, but every
-- one is editable and each school can replace the lot.
INSERT INTO video_tag_types (school_id, label, hotkey, color, sort_order, lead_seconds, trail_seconds)
SELECT s.id, v.label, v.hotkey, v.color, v.ord, v.lead, v.trail
FROM schools s
CROSS JOIN (VALUES
  ('Goal',            'g', '#34d399', 1, 12, 6),
  ('Shot',            's', '#38bdf8', 2,  8, 4),
  ('Penalty Corner',  'p', '#fbbf24', 3, 10, 8),
  ('Circle Entry',    'c', '#a78bfa', 4,  8, 4),
  ('Turnover',        't', '#f87171', 5,  6, 6),
  ('Press',           'r', '#22d3ee', 6,  8, 5),
  ('Good Play',       'w', '#4ade80', 7,  8, 4),
  ('Coaching Point',  'k', '#fb923c', 8, 10, 5)
) AS v(label, hotkey, color, ord, lead, trail)
ON CONFLICT (school_id, sport, label) DO NOTHING;

NOTIFY pgrst, 'reload schema';

SELECT s.name AS school, count(t.id) AS tag_types
FROM schools s LEFT JOIN video_tag_types t ON t.school_id = s.id
GROUP BY s.name ORDER BY s.name;
