-- ============================================================
-- RELEASE SECURITY SETUP
-- Run this in Supabase SQL Editor
-- Safe to run multiple times (idempotent)
-- ============================================================

-- ── 1. TEAM-LEVEL ACCESS HELPER ────────────────────────────
-- Returns true if the current user can access the given team
create or replace function public.can_access_team(team_name text)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.staff_roles
    where email = auth.email()
      and is_active = true
      and (
        role in ('owner', 'head_of_hockey')
        or (role = 'coach' and team_name = any(teams))
      )
  );
$$;

-- ── 2. ATHLETES — team-level RLS ───────────────────────────
drop policy if exists "athletes_staff_select"   on public.athletes;
drop policy if exists "athletes_staff_insert"   on public.athletes;
drop policy if exists "athletes_staff_update"   on public.athletes;
drop policy if exists "athletes_hoh_delete"     on public.athletes;

-- Coaches can only see athletes on their assigned teams
create policy "athletes_team_select"
  on public.athletes for select
  using (public.can_access_team(team));

-- Coaches can only add athletes to their assigned teams
create policy "athletes_team_insert"
  on public.athletes for insert
  with check (public.can_access_team(team));

-- Coaches can only update athletes on their assigned teams
create policy "athletes_team_update"
  on public.athletes for update
  using (public.can_access_team(team))
  with check (public.can_access_team(team));

-- Only HOH/owner can delete athletes
create policy "athletes_hoh_delete"
  on public.athletes for delete
  using (
    exists (
      select 1 from public.staff_roles
      where email = auth.email()
        and is_active = true
        and role in ('owner', 'head_of_hockey')
    )
  );

-- ── 3. ATTENDANCE — team-level RLS ─────────────────────────
drop policy if exists "attendance_staff_select" on public.attendance;
drop policy if exists "attendance_staff_insert" on public.attendance;
drop policy if exists "attendance_staff_update" on public.attendance;
drop policy if exists "attendance_staff_delete" on public.attendance;

create policy "attendance_team_select"
  on public.attendance for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

create policy "attendance_team_insert"
  on public.attendance for insert
  with check (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

create policy "attendance_team_update"
  on public.attendance for update
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

create policy "attendance_team_delete"
  on public.attendance for delete
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

-- ── 4. PERFORMANCE TESTS — team-level RLS ──────────────────
drop policy if exists "performance_tests_staff_select" on public.performance_tests;
drop policy if exists "performance_tests_staff_insert" on public.performance_tests;
drop policy if exists "performance_tests_staff_update" on public.performance_tests;
drop policy if exists "performance_tests_staff_delete" on public.performance_tests;

create policy "perf_tests_team_select"
  on public.performance_tests for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

create policy "perf_tests_team_insert"
  on public.performance_tests for insert
  with check (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

create policy "perf_tests_team_update"
  on public.performance_tests for update
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

create policy "perf_tests_team_delete"
  on public.performance_tests for delete
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

-- ── 5. COACH NOTES — team-level RLS ────────────────────────
drop policy if exists "coach_notes_staff_select" on public.coach_notes;
drop policy if exists "coach_notes_staff_insert" on public.coach_notes;
drop policy if exists "coach_notes_staff_update" on public.coach_notes;
drop policy if exists "coach_notes_staff_delete" on public.coach_notes;

create policy "coach_notes_team_select"
  on public.coach_notes for select
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

create policy "coach_notes_team_insert"
  on public.coach_notes for insert
  with check (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

create policy "coach_notes_team_update"
  on public.coach_notes for update
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

create policy "coach_notes_team_delete"
  on public.coach_notes for delete
  using (
    exists (
      select 1 from public.athletes a
      where a.id = athlete_id
        and public.can_access_team(a.team)
    )
  );

-- ── 6. PORTAL TABLES RLS ───────────────────────────────────
alter table if exists public.portal_fixtures     enable row level security;
alter table if exists public.portal_results      enable row level security;
alter table if exists public.portal_week_plans   enable row level security;
alter table if exists public.portal_reminders    enable row level security;
alter table if exists public.portal_programs     enable row level security;
alter table if exists public.portal_sponsors     enable row level security;

-- Public can read portal content (parents/players viewing portal)
drop policy if exists "portal_fixtures_public_read"   on public.portal_fixtures;
drop policy if exists "portal_results_public_read"    on public.portal_results;
drop policy if exists "portal_week_plans_public_read" on public.portal_week_plans;
drop policy if exists "portal_reminders_public_read"  on public.portal_reminders;
drop policy if exists "portal_programs_public_read"   on public.portal_programs;
drop policy if exists "portal_sponsors_public_read"   on public.portal_sponsors;

create policy "portal_fixtures_public_read"   on public.portal_fixtures   for select using (true);
create policy "portal_results_public_read"    on public.portal_results    for select using (true);
create policy "portal_week_plans_public_read" on public.portal_week_plans for select using (true);
create policy "portal_reminders_public_read"  on public.portal_reminders  for select using (true);
create policy "portal_programs_public_read"   on public.portal_programs   for select using (true);
create policy "portal_sponsors_public_read"   on public.portal_sponsors   for select using (true);

-- Only HOH/owner can write portal content
drop policy if exists "portal_fixtures_staff_write"   on public.portal_fixtures;
drop policy if exists "portal_results_staff_write"    on public.portal_results;
drop policy if exists "portal_week_plans_staff_write" on public.portal_week_plans;
drop policy if exists "portal_reminders_staff_write"  on public.portal_reminders;
drop policy if exists "portal_programs_staff_write"   on public.portal_programs;
drop policy if exists "portal_sponsors_staff_write"   on public.portal_sponsors;

create policy "portal_fixtures_staff_write"   on public.portal_fixtures   for all to authenticated using (public.is_hoh_or_owner()) with check (public.is_hoh_or_owner());
create policy "portal_results_staff_write"    on public.portal_results    for all to authenticated using (public.is_hoh_or_owner()) with check (public.is_hoh_or_owner());
create policy "portal_week_plans_staff_write" on public.portal_week_plans for all to authenticated using (public.is_hoh_or_owner()) with check (public.is_hoh_or_owner());
create policy "portal_reminders_staff_write"  on public.portal_reminders  for all to authenticated using (public.is_hoh_or_owner()) with check (public.is_hoh_or_owner());
create policy "portal_programs_staff_write"   on public.portal_programs   for all to authenticated using (public.is_hoh_or_owner()) with check (public.is_hoh_or_owner());
create policy "portal_sponsors_staff_write"   on public.portal_sponsors   for all to authenticated using (public.is_hoh_or_owner()) with check (public.is_hoh_or_owner());

-- ── 7. is_hoh_or_owner helper ──────────────────────────────
create or replace function public.is_hoh_or_owner()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.staff_roles
    where email = auth.email()
      and is_active = true
      and role in ('owner', 'head_of_hockey')
  );
$$;

-- ── 8. GRANT service role bypass for API routes ─────────────
-- API routes use service role key and bypass RLS intentionally
-- This is correct — they do their own auth checks server-side
grant select, insert, update, delete on public.hp_students to service_role;
grant select, insert, update, delete on public.hp_attendance to service_role;
grant select, insert, update, delete on public.hp_test_results to service_role;
grant select, insert, update, delete on public.athletes to service_role;
grant select, insert, update, delete on public.attendance to service_role;
grant select, insert, update, delete on public.performance_tests to service_role;
grant select, insert, update, delete on public.coach_notes to service_role;
grant select, insert, update, delete on public.staff_roles to service_role;
grant select, insert, update, delete on public.portal_fixtures to service_role;
grant select, insert, update, delete on public.portal_results to service_role;
grant select, insert, update, delete on public.portal_week_plans to service_role;
grant select, insert, update, delete on public.portal_reminders to service_role;
grant select, insert, update, delete on public.portal_programs to service_role;
grant select, insert, update, delete on public.portal_sponsors to service_role;
