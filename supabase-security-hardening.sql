-- ═══════════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING — closes RLS gaps found in the multi-school security audit.
-- Five tables used by the app had NO row-level security defined in the repo:
--   player_profiles          (links accounts → athletes: children's data — CRITICAL)
--   athlete_sports           (staff-managed athlete/sport links)
--   portal_week_plan_items   (public portal content, staff-written)
--   portal_spotlight         (public portal content, staff-written)
--   hp_audit_log             (server-written audit trail)
-- Policies below mirror the existing patterns in supabase-release-security.sql.
-- Safe to run multiple times. Run AFTER supabase-release-security.sql.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── player_profiles: server-API only ─────────────────────────────────────────
-- All reads/writes go through /api/player/* (service role). No browser client
-- touches this table, so it is fully locked: RLS on, no anon/authenticated
-- policies at all. Service role bypasses RLS by design.
alter table if exists public.player_profiles enable row level security;

-- ── athlete_sports: staff read/write (mirrors athletes table) ────────────────
alter table if exists public.athlete_sports enable row level security;
drop policy if exists "athlete_sports_staff_read"  on public.athlete_sports;
drop policy if exists "athlete_sports_staff_write" on public.athlete_sports;
create policy "athlete_sports_staff_read"  on public.athlete_sports
  for select to authenticated using (public.current_staff_role() is not null);
create policy "athlete_sports_staff_write" on public.athlete_sports
  for all to authenticated using (public.current_staff_role() is not null)
  with check (public.current_staff_role() is not null);

-- ── portal_week_plan_items: public read, HOH/owner write (mirrors portal_*) ──
alter table if exists public.portal_week_plan_items enable row level security;
drop policy if exists "portal_week_plan_items_public_read" on public.portal_week_plan_items;
drop policy if exists "portal_week_plan_items_staff_write" on public.portal_week_plan_items;
create policy "portal_week_plan_items_public_read" on public.portal_week_plan_items
  for select using (true);
create policy "portal_week_plan_items_staff_write" on public.portal_week_plan_items
  for all to authenticated using (public.is_hoh_or_owner())
  with check (public.is_hoh_or_owner());

-- ── portal_spotlight: public read, HOH/owner write ───────────────────────────
alter table if exists public.portal_spotlight enable row level security;
drop policy if exists "portal_spotlight_public_read" on public.portal_spotlight;
drop policy if exists "portal_spotlight_staff_write" on public.portal_spotlight;
create policy "portal_spotlight_public_read" on public.portal_spotlight
  for select using (true);
create policy "portal_spotlight_staff_write" on public.portal_spotlight
  for all to authenticated using (public.is_hoh_or_owner())
  with check (public.is_hoh_or_owner());

-- ── hp_audit_log: server-API only (like player_profiles) ─────────────────────
-- Written and read exclusively via HP API routes using the service role.
alter table if exists public.hp_audit_log enable row level security;
