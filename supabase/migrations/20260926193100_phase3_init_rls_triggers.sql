-- Mirror of migration applied via Supabase MCP (Phase 3 — RLS, grants, triggers)
-- Companion: 20260926193000_phase3_init.sql (DDL)

-- §5 RLS
alter table public.profiles enable row level security;
alter table public.github_profiles enable row level security;
alter table public.repositories enable row level security;
alter table public.repository_languages enable row level security;
alter table public.contribution_days enable row level security;
alter table public.activity_events enable row level security;
alter table public.analytics_snapshots enable row level security;
alter table public.ai_insights enable row level security;
alter table public.sync_runs enable row level security;
alter table public.github_credentials enable row level security;

-- Owner policies
create policy "owner_select" on public.profiles for select using (auth.uid() = user_id);
create policy "owner_insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.profiles for delete using (auth.uid() = user_id);

create policy "owner_select" on public.github_profiles for select using (auth.uid() = user_id);
create policy "owner_insert" on public.github_profiles for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.github_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.github_profiles for delete using (auth.uid() = user_id);

create policy "owner_select" on public.repositories for select using (auth.uid() = user_id);
create policy "owner_insert" on public.repositories for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.repositories for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.repositories for delete using (auth.uid() = user_id);

create policy "owner_select" on public.repository_languages for select using (auth.uid() = user_id);
create policy "owner_insert" on public.repository_languages for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.repository_languages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.repository_languages for delete using (auth.uid() = user_id);

create policy "owner_select" on public.contribution_days for select using (auth.uid() = user_id);
create policy "owner_insert" on public.contribution_days for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.contribution_days for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.contribution_days for delete using (auth.uid() = user_id);

create policy "owner_select" on public.activity_events for select using (auth.uid() = user_id);
create policy "owner_insert" on public.activity_events for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.activity_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.activity_events for delete using (auth.uid() = user_id);

create policy "owner_select" on public.analytics_snapshots for select using (auth.uid() = user_id);
create policy "owner_insert" on public.analytics_snapshots for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.analytics_snapshots for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.analytics_snapshots for delete using (auth.uid() = user_id);

create policy "owner_select" on public.ai_insights for select using (auth.uid() = user_id);
create policy "owner_insert" on public.ai_insights for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.ai_insights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.ai_insights for delete using (auth.uid() = user_id);

create policy "owner_select" on public.sync_runs for select using (auth.uid() = user_id);
create policy "owner_insert" on public.sync_runs for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.sync_runs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_delete" on public.sync_runs for delete using (auth.uid() = user_id);

-- Public profile reads (§5.3)
create policy "public_profile_select" on public.profiles for select using (is_public = true);

create policy "public_github_profile_select" on public.github_profiles for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = github_profiles.user_id and p.is_public = true
  )
);

create policy "public_repositories_select" on public.repositories for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = repositories.user_id and p.is_public = true
  )
);

create policy "public_repository_languages_select" on public.repository_languages for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = repository_languages.user_id and p.is_public = true
  )
);

create policy "public_contribution_days_select" on public.contribution_days for select using (
  exists (
    select 1 from public.profiles p
    where p.user_id = contribution_days.user_id and p.is_public = true
  )
);

-- §5.4 credentials lockdown
revoke all on public.github_credentials from anon, authenticated;
grant all on public.github_credentials to service_role;

-- Data API grants for new tables
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.profiles to anon;
grant select, insert, update, delete on public.github_profiles to authenticated;
grant select on public.github_profiles to anon;
grant select, insert, update, delete on public.repositories to authenticated;
grant select on public.repositories to anon;
grant select, insert, update, delete on public.repository_languages to authenticated;
grant select on public.repository_languages to anon;
grant select, insert, update, delete on public.contribution_days to authenticated;
grant select on public.contribution_days to anon;
grant select, insert, update, delete on public.activity_events to authenticated;
grant select, insert, update, delete on public.analytics_snapshots to authenticated;
grant select, insert, update, delete on public.ai_insights to authenticated;
grant select, insert, update, delete on public.sync_runs to authenticated;

-- §6.1 updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_touch_profiles
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger trg_touch_github_credentials
before update on public.github_credentials
for each row execute function public.touch_updated_at();

create trigger trg_touch_github_profiles
before update on public.github_profiles
for each row execute function public.touch_updated_at();

create trigger trg_touch_repositories
before update on public.repositories
for each row execute function public.touch_updated_at();

-- §6.2 signup profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id, github_login, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', new.raw_user_meta_data->>'preferred_username'),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
