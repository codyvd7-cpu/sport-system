-- ═══════════════════════════════════════════════════════════════════════════════
-- PARENT/GUARDIAN CONTACT — adds fields for coaches to reach a parent directly
-- (emergency contact, general communication). Nullable, no data migration
-- needed. Already covered by athletes' existing team-scoped RLS policies —
-- no new policy required, this just adds columns to an already-secured table.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE athletes ADD COLUMN IF NOT EXISTS parent_name text;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS parent_phone text;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS parent_email text;

NOTIFY pgrst, 'reload schema';
