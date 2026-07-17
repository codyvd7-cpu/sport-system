-- ═══════════════════════════════════════════════════════════════════════════════
-- GYM CHECK-INS — self-service QR attendance logged by players themselves.
-- Kept SEPARATE from the coach-taken `attendance` register on purpose:
-- one is verified by staff, the other is self-reported. Run in Supabase.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gym_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid NOT NULL,
  checkin_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Johannesburg')::date,
  checkin_time time NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Johannesburg')::time,
  venue text NOT NULL DEFAULT 'Gym',
  source text NOT NULL DEFAULT 'qr',
  created_at timestamptz DEFAULT now()
);

-- One check-in per athlete per venue per day — scanning twice is a no-op
DO $$ BEGIN
  ALTER TABLE gym_checkins
    ADD CONSTRAINT gym_checkins_unique UNIQUE (athlete_id, checkin_date, venue);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_gym_checkins_athlete ON gym_checkins (athlete_id, checkin_date DESC);

-- RLS: locked down — all reads/writes go through the server API (service role)
ALTER TABLE gym_checkins ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON gym_checkins TO service_role;
