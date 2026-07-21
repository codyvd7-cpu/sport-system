-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: push_subscriptions is missing columns the current code writes to.
--
-- What happened: supabase-alerts-push.sql used CREATE TABLE IF NOT EXISTS, but
-- push_subscriptions already existed (from the older notifications bell feature,
-- with columns email/endpoint/p256dh/auth_key) — so that migration silently
-- no-opped and the table never got the columns the alert/push system actually
-- needs (auth, user_id, label). This adds them without touching existing data.
-- Safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS auth text;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS label text;

-- Backfill from the old column name so any subscriptions saved by the legacy
-- notifications bell keep working under the new code path too.
UPDATE push_subscriptions SET auth = auth_key WHERE auth IS NULL AND auth_key IS NOT NULL;

-- Ensure the unique constraint on endpoint exists (required for upsert onConflict)
DO $$ BEGIN
  ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
