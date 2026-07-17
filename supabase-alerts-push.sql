-- ═══════════════════════════════════════════════════════════════════════════════
-- PUSH NOTIFICATIONS + URGENT ALERTS (lightning) — run in Supabase
-- ═══════════════════════════════════════════════════════════════════════════════

-- Browser push subscriptions (players, parents, staff — anyone who enables alerts)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_id uuid,               -- set when a signed-in player subscribes; null for portal parents
  label text,                 -- e.g. 'player' | 'portal'
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_created ON push_subscriptions (created_at DESC);

-- Urgent alerts (lightning etc). One "active" alert at a time in practice.
CREATE TABLE IF NOT EXISTS urgent_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'lightning',
  message text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz DEFAULT now(),
  cleared_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_urgent_alerts_active ON urgent_alerts (active, created_at DESC);

-- Locked down — all access goes through the server API (service role)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE urgent_alerts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO service_role;
GRANT SELECT, INSERT, UPDATE ON urgent_alerts TO service_role;
