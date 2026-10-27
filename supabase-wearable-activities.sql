-- ─── wearable_activities ──────────────────────────────────────────────────────
-- Training sessions pulled from an athlete's phone health store (Apple Health /
-- Google Health Connect) via the native app. Written only by the service-role
-- ingest endpoint (/api/athlete/health); read by the athlete themselves and by
-- staff of the same school.
--
-- Safe to run more than once.

create table if not exists public.wearable_activities (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  school_id uuid,
  source text not null,                 -- 'apple_health' | 'health_connect'
  workout_type text,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_s integer,
  distance_m numeric,
  calories numeric,
  avg_hr integer,
  max_hr integer,
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (athlete_id, source, start_time)
);

create index if not exists wearable_activities_athlete_time
  on public.wearable_activities (athlete_id, start_time desc);

alter table public.wearable_activities enable row level security;

-- Athletes read their own, resolved through their linked player account.
drop policy if exists wa_read_own on public.wearable_activities;
create policy wa_read_own on public.wearable_activities for select to authenticated
  using (exists (
    select 1 from public.player_profiles pp
    where pp.athlete_id = wearable_activities.athlete_id
      and pp.user_id = auth.uid()
  ));

-- Staff read within their own school only.
drop policy if exists wa_read_staff on public.wearable_activities;
create policy wa_read_staff on public.wearable_activities for select to authenticated
  using (exists (
    select 1 from public.staff_roles sr
    where sr.user_id = auth.uid()
      and sr.is_active = true
      and sr.school_id = wearable_activities.school_id
  ));

-- No write policies: only the service role (ingest endpoint) inserts.
revoke all on public.wearable_activities from anon;
grant select on public.wearable_activities to authenticated;
