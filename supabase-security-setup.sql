-- ═══════════════════════════════════════════════════════════════════════
-- HPOS / SPORT SYSTEM — SECURITY SETUP
-- ═══════════════════════════════════════════════════════════════════════
-- Run this in Supabase Dashboard → SQL Editor.
-- It is idempotent — safe to run multiple times.
-- ═══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. UNIQUE CONSTRAINTS — prevent duplicate data
-- ────────────────────────────────────────────────────────────────────

-- Attendance: one record per athlete per session per date
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'attendance_unique_per_session'
  ) then
    alter table public.attendance
      add constraint attendance_unique_per_session
      unique (athlete_id, session_date, session_type);
  end if;
exception when others then null;
end $$;

-- Performance tests: one result per athlete per date per test type
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'performance_tests_unique_per_date'
  ) then
    alter table public.performance_tests
      add constraint performance_tests_unique_per_date
      unique (athlete_id, test_date, test_type);
  end if;
exception when others then null;
end $$;

-- HP attendance: one record per student per session
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'hp_attendance_unique_per_session'
  ) then
    alter table public.hp_attendance
      add constraint hp_attendance_unique_per_session
      unique (student_id, session_date);
  end if;
exception when others then null;
end $$;

-- HP test results: one record per student per term per year
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'hp_test_results_unique_per_term'
  ) then
    alter table public.hp_test_results
      add constraint hp_test_results_unique_per_term
      unique (student_id, year, term);
  end if;
exception when others then null;
end $$;

-- Athlete player codes must be unique
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'athletes_player_code_unique'
  ) then
    alter table public.athletes
      add constraint athletes_player_code_unique
      unique (player_code);
  end if;
exception when others then null;
end $$;

-- Staff roles emails must be unique
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'staff_roles_email_unique'
  ) then
    alter table public.staff_roles
      add constraint staff_roles_email_unique
      unique (email);
  end if;
exception when others then null;
end $$;

-- ────────────────────────────────────────────────────────────────────
-- 2. HELPER FUNCTION — check staff role for current user
-- ────────────────────────────────────────────────────────────────────

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.staff_roles
  where email = (auth.jwt() ->> 'email')
    and is_active = true
  limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_roles
    where email = (auth.jwt() ->> 'email')
      and is_active = true
  );
$$;

create or replace function public.is_hoh_or_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_roles
    where email = (auth.jwt() ->> 'email')
      and is_active = true
      and role in ('owner', 'head_of_hockey')
  );
$$;

-- ────────────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY — enable on every sensitive table
-- ────────────────────────────────────────────────────────────────────

alter table public.athletes          enable row level security;
alter table public.attendance        enable row level security;
alter table public.performance_tests enable row level security;
alter table public.coach_notes       enable row level security;
alter table public.staff_roles       enable row level security;
alter table public.hp_students       enable row level security;
alter table public.hp_attendance     enable row level security;
alter table public.hp_test_results   enable row level security;

-- ────────────────────────────────────────────────────────────────────
-- 4. POLICIES — ATHLETES
-- ────────────────────────────────────────────────────────────────────

-- Drop existing if any (so this script is rerunnable)
drop policy if exists "athletes_staff_select"  on public.athletes;
drop policy if exists "athletes_staff_modify"  on public.athletes;
drop policy if exists "athletes_hoh_delete"    on public.athletes;
drop policy if exists "athletes_public_by_code" on public.athletes;

-- All staff can read athletes
create policy "athletes_staff_select"
  on public.athletes for select
  using (public.is_staff());

-- Staff can insert/update
create policy "athletes_staff_modify"
  on public.athletes for insert
  with check (public.is_staff());

create policy "athletes_staff_update"
  on public.athletes for update
  using (public.is_staff())
  with check (public.is_staff());

-- Only HOH/owner can delete
create policy "athletes_hoh_delete"
  on public.athletes for delete
  using (public.is_hoh_or_owner());

-- ────────────────────────────────────────────────────────────────────
-- 5. POLICIES — ATTENDANCE
-- ────────────────────────────────────────────────────────────────────

drop policy if exists "attendance_staff_all" on public.attendance;

create policy "attendance_staff_all"
  on public.attendance for all
  using (public.is_staff())
  with check (public.is_staff());

-- ────────────────────────────────────────────────────────────────────
-- 6. POLICIES — PERFORMANCE TESTS
-- ────────────────────────────────────────────────────────────────────

drop policy if exists "performance_staff_all" on public.performance_tests;

create policy "performance_staff_all"
  on public.performance_tests for all
  using (public.is_staff())
  with check (public.is_staff());

-- ────────────────────────────────────────────────────────────────────
-- 7. POLICIES — COACH NOTES (most sensitive — strict)
-- ────────────────────────────────────────────────────────────────────

drop policy if exists "coach_notes_staff_select" on public.coach_notes;
drop policy if exists "coach_notes_staff_modify" on public.coach_notes;
drop policy if exists "coach_notes_hoh_delete"   on public.coach_notes;

create policy "coach_notes_staff_select"
  on public.coach_notes for select
  using (public.is_staff());

create policy "coach_notes_staff_modify"
  on public.coach_notes for insert
  with check (public.is_staff());

create policy "coach_notes_staff_update"
  on public.coach_notes for update
  using (public.is_staff())
  with check (public.is_staff());

create policy "coach_notes_hoh_delete"
  on public.coach_notes for delete
  using (public.is_hoh_or_owner());

-- ────────────────────────────────────────────────────────────────────
-- 8. POLICIES — STAFF ROLES (only owners can manage)
-- ────────────────────────────────────────────────────────────────────

drop policy if exists "staff_roles_self_read"  on public.staff_roles;
drop policy if exists "staff_roles_owner_all"  on public.staff_roles;

-- Staff can see their own role
create policy "staff_roles_self_read"
  on public.staff_roles for select
  using (email = (auth.jwt() ->> 'email') or public.is_hoh_or_owner());

-- Only owners can insert/update/delete staff roles
create policy "staff_roles_owner_modify"
  on public.staff_roles for insert
  with check (public.current_staff_role() = 'owner');

create policy "staff_roles_owner_update"
  on public.staff_roles for update
  using (public.current_staff_role() = 'owner')
  with check (public.current_staff_role() = 'owner');

create policy "staff_roles_owner_delete"
  on public.staff_roles for delete
  using (public.current_staff_role() = 'owner');

-- ────────────────────────────────────────────────────────────────────
-- 9. POLICIES — HP TABLES
-- ────────────────────────────────────────────────────────────────────

drop policy if exists "hp_students_staff_all"     on public.hp_students;
drop policy if exists "hp_attendance_staff_all"   on public.hp_attendance;
drop policy if exists "hp_test_results_staff_all" on public.hp_test_results;

create policy "hp_students_staff_all"
  on public.hp_students for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "hp_attendance_staff_all"
  on public.hp_attendance for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "hp_test_results_staff_all"
  on public.hp_test_results for all
  using (public.is_staff())
  with check (public.is_staff());

-- ────────────────────────────────────────────────────────────────────
-- 10. AUDIT LOG TABLE — track who deleted/edited sensitive records
-- ────────────────────────────────────────────────────────────────────

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_email text,
  action      text not null,   -- 'delete' | 'update' | 'create'
  table_name  text not null,
  record_id   text,
  details     jsonb
);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_hoh_select" on public.audit_log;
drop policy if exists "audit_log_insert_authed" on public.audit_log;

-- Only HOH/owner can read the audit log
create policy "audit_log_hoh_select"
  on public.audit_log for select
  using (public.is_hoh_or_owner());

-- Any authenticated staff can insert (so the app can log their actions)
create policy "audit_log_insert_authed"
  on public.audit_log for insert
  with check (public.is_staff());

-- Audit log entries cannot be modified or deleted by anyone (immutable trail)
-- No update/delete policies = denied by default with RLS on.

-- ────────────────────────────────────────────────────────────────────
-- 11. AUDIT TRIGGERS — auto-log deletes from sensitive tables
-- ────────────────────────────────────────────────────────────────────

create or replace function public.audit_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (actor_email, action, table_name, record_id, details)
  values (
    coalesce(auth.jwt() ->> 'email', 'system'),
    'delete',
    TG_TABLE_NAME,
    coalesce(old.id::text, ''),
    to_jsonb(old)
  );
  return old;
end;
$$;

drop trigger if exists trg_audit_athletes_delete       on public.athletes;
drop trigger if exists trg_audit_attendance_delete     on public.attendance;
drop trigger if exists trg_audit_performance_delete    on public.performance_tests;
drop trigger if exists trg_audit_coach_notes_delete    on public.coach_notes;
drop trigger if exists trg_audit_hp_students_delete    on public.hp_students;
drop trigger if exists trg_audit_staff_roles_delete    on public.staff_roles;

create trigger trg_audit_athletes_delete
  after delete on public.athletes
  for each row execute function public.audit_delete();

create trigger trg_audit_attendance_delete
  after delete on public.attendance
  for each row execute function public.audit_delete();

create trigger trg_audit_performance_delete
  after delete on public.performance_tests
  for each row execute function public.audit_delete();

create trigger trg_audit_coach_notes_delete
  after delete on public.coach_notes
  for each row execute function public.audit_delete();

create trigger trg_audit_hp_students_delete
  after delete on public.hp_students
  for each row execute function public.audit_delete();

create trigger trg_audit_staff_roles_delete
  after delete on public.staff_roles
  for each row execute function public.audit_delete();

-- ────────────────────────────────────────────────────────────────────
-- 12. MAKE SURE THE OWNER ACCOUNT EXISTS
-- ────────────────────────────────────────────────────────────────────
-- Replace 'codyvd7@gmail.com' with your real owner email before running
-- this block, then uncomment:
--
--   insert into public.staff_roles (email, role, full_name, is_active)
--   values ('codyvd7@gmail.com', 'owner', 'Cody Van Dyk', true)
--   on conflict (email) do update set role = 'owner', is_active = true;

-- ═══════════════════════════════════════════════════════════════════════
-- DONE.
-- After running, verify in Supabase → Authentication → Policies that
-- every sensitive table has RLS enabled and policies attached.
-- ═══════════════════════════════════════════════════════════════════════
