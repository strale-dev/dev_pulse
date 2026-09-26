# DevPulse — Database Schema

> **Version:** 1.0
> **Companion docs:** `PRD.md`, `Tech.md`
> **Database:** Supabase Postgres (project `mmvbuktxfjmdcfyswocb`)
> **ORM:** Drizzle ORM · **Migrations:** `drizzle-kit` (SQL applied via Supabase MCP)
> **Last updated:** 2026-09-26

---

## 1. Design Principles

1. **User-scoped from day one.** Every user-owned row carries `user_id uuid` referencing `auth.users(id)`; every user-owned table has **RLS enabled** with `auth.uid() = user_id` policies.
2. **Normalized + JSONB snapshot** (per decision record §Q20). Structured tables for what we query; a `raw` JSONB column on sync-heavy tables for audit / re-processing without a re-fetch.
3. **Cache-first.** GitHub responses are persisted with `fetched_at` / `stale_after` timestamps so RSC reads never hit GitHub.
4. **Reproducible analytics.** All derived metrics live in `analytics_snapshots`, keyed by a stable content hash so AI insights can be re-cached deterministically.
5. **Small primary keys.** Prefer `uuid` (Supabase-native) or GitHub's own numeric IDs (`bigint`) where they exist. Avoid natural composite PKs.
6. **Timestamps everywhere.** Every table has `created_at timestamptz not null default now()` and `updated_at timestamptz not null default now()` (trigger-maintained).

---

## 2. Extensions

Enable in the Supabase project (Phase 3):

```sql
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";
```

- `pgcrypto` — for encrypting GitHub `provider_token`.
- `citext` — case-insensitive GitHub logins on the public profile route (`/u/[username]`).

---

## 3. Schema Overview

```
auth.users  (managed by Supabase Auth)
    │
    ├── public.profiles                    (1:1, DevPulse-specific user prefs)
    ├── public.github_credentials          (1:1, encrypted OAuth token)
    ├── public.github_profiles             (1:1, cached GitHub identity)
    │
    ├── public.repositories                (1:N, cached repo metadata)
    │       └── public.repository_languages (N:1 per repo, byte counts)
    │
    ├── public.contribution_days           (N per user, one row per calendar day)
    ├── public.activity_events             (N per user, daily aggregate of commits/PRs/issues)
    │
    ├── public.analytics_snapshots         (versioned, hashed rollup for the AI)
    └── public.ai_insights                 (cached AI output per snapshot hash)

public.sync_runs                           (audit log of GitHub sync executions)
```

---

## 4. Table Definitions

### 4.1 `public.profiles` — DevPulse user preferences

Extends `auth.users` with product-level fields (visibility, timezone, feature flags).

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` **PK** | FK → `auth.users(id)` on delete cascade |
| `github_login` | `citext` unique | Populated on first sync; used by `/u/[login]` |
| `display_name` | `text` | Falls back to GitHub name |
| `bio` | `text` | Mirror of GitHub bio (denormalized for public profile query speed) |
| `avatar_url` | `text` | |
| `timezone` | `text` | IANA tz (default `UTC`) |
| `is_public` | `boolean` not null default `true` | Controls `/u/[login]` visibility |
| `onboarding_completed_at` | `timestamptz` | Null until first sync finishes |
| `created_at` | `timestamptz` not null default `now()` | |
| `updated_at` | `timestamptz` not null default `now()` | Trigger-maintained |

Indexes:
- `idx_profiles_github_login` on `(github_login)` — public profile lookup.

### 4.2 `public.github_credentials` — Encrypted OAuth token

Server-only, never selected from client code.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` **PK** | FK → `auth.users(id)` cascade |
| `provider_token_encrypted` | `bytea` not null | `pgp_sym_encrypt(token, key)` |
| `scopes` | `text[]` not null | e.g. `{read:user,user:email}` |
| `token_type` | `text` | Usually `bearer` |
| `github_user_id` | `bigint` unique | GitHub numeric ID (from OAuth response) |
| `rotated_at` | `timestamptz` | Set when token is refreshed / re-consented |
| `created_at` | `timestamptz` not null default `now()` | |
| `updated_at` | `timestamptz` not null default `now()` | |

RLS: **no** direct client access. Reads only via `security definer` server helpers.

### 4.3 `public.github_profiles` — Cached GitHub identity

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` **PK** | FK → `auth.users(id)` cascade |
| `github_user_id` | `bigint` not null unique | |
| `login` | `citext` not null | |
| `name` | `text` | |
| `bio` | `text` | |
| `avatar_url` | `text` | |
| `company` | `text` | |
| `location` | `text` | |
| `blog` | `text` | |
| `twitter_username` | `text` | |
| `public_repos` | `integer` | |
| `followers` | `integer` | |
| `following` | `integer` | |
| `github_created_at` | `timestamptz` | |
| `fetched_at` | `timestamptz` not null | |
| `stale_after` | `timestamptz` not null | `fetched_at + interval '60 minutes'` |
| `raw` | `jsonb` not null | Full REST response snapshot |
| `updated_at` | `timestamptz` not null default `now()` | |

### 4.4 `public.repositories` — Cached repository metadata

| Column | Type | Notes |
|---|---|---|
| `id` | `bigint` **PK** | GitHub repo ID |
| `user_id` | `uuid` not null | FK → `auth.users(id)` cascade — owner in DevPulse (not necessarily GitHub owner if we later support orgs) |
| `owner_login` | `citext` not null | |
| `name` | `text` not null | |
| `full_name` | `citext` not null | `owner/name` |
| `description` | `text` | |
| `html_url` | `text` not null | |
| `homepage` | `text` | |
| `is_fork` | `boolean` not null default `false` | |
| `is_archived` | `boolean` not null default `false` | |
| `is_private` | `boolean` not null default `false` | Always false in MVP (public only) |
| `primary_language` | `text` | GitHub's `language` field |
| `stargazers_count` | `integer` not null default `0` | |
| `forks_count` | `integer` not null default `0` | |
| `open_issues_count` | `integer` not null default `0` | |
| `default_branch` | `text` | |
| `pushed_at` | `timestamptz` | |
| `github_created_at` | `timestamptz` | |
| `github_updated_at` | `timestamptz` | |
| `fetched_at` | `timestamptz` not null | |
| `stale_after` | `timestamptz` not null | 60 min |
| `raw` | `jsonb` not null | |
| `created_at` | `timestamptz` not null default `now()` | |
| `updated_at` | `timestamptz` not null default `now()` | |

Indexes:
- `idx_repositories_user_id` on `(user_id)`
- `idx_repositories_user_pushed` on `(user_id, pushed_at desc)` — "recently updated" sort
- `idx_repositories_user_stars` on `(user_id, stargazers_count desc)` — "most stars" sort
- Unique `(user_id, full_name)` — defensive

### 4.5 `public.repository_languages` — Language byte counts

One row per (repo, language). Recomputed on 24h TTL.

| Column | Type | Notes |
|---|---|---|
| `repository_id` | `bigint` not null | FK → `repositories(id)` cascade |
| `user_id` | `uuid` not null | FK → `auth.users(id)` cascade — denormalized for RLS |
| `language` | `text` not null | |
| `bytes` | `bigint` not null | |
| `fetched_at` | `timestamptz` not null | |
| **PK** | `(repository_id, language)` | |

Indexes:
- `idx_repo_languages_user` on `(user_id)`

### 4.6 `public.contribution_days` — 52-week contribution calendar

Sourced from GraphQL `contributionsCollection.contributionCalendar` — this is what drives the heatmap and streaks.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` not null | FK → `auth.users(id)` cascade |
| `day` | `date` not null | UTC calendar day |
| `contributions` | `integer` not null default `0` | GitHub's daily total |
| `level` | `smallint` not null default `0` | 0–4 (GitHub's intensity tier) |
| `fetched_at` | `timestamptz` not null | |
| **PK** | `(user_id, day)` | |

Indexes:
- `idx_contrib_days_user_day` on `(user_id, day desc)`

### 4.7 `public.activity_events` — Daily aggregate of commits / PRs / issues

Used by the `ActivityChart` (7D / 30D / 90D / 1Y). Populated by the sync job from REST events + `contributionsCollection.commitContributionsByRepository` etc.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid` not null | FK → `auth.users(id)` cascade |
| `day` | `date` not null | |
| `commits` | `integer` not null default `0` | |
| `pull_requests` | `integer` not null default `0` | |
| `issues` | `integer` not null default `0` | |
| `code_reviews` | `integer` not null default `0` | Reserved (post-MVP; may stay 0 in v1) |
| **PK** | `(user_id, day)` | |

Indexes:
- `idx_activity_user_day` on `(user_id, day desc)`

### 4.8 `public.analytics_snapshots` — Versioned rollup for the AI

Each successful sync produces one snapshot. Old snapshots are retained (for a Regenerate history feature later); latest is queried by `where user_id = ? order by created_at desc limit 1`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` **PK** default `gen_random_uuid()` | |
| `user_id` | `uuid` not null | FK → `auth.users(id)` cascade |
| `window_days` | `integer` not null default `365` | Snapshot window (1Y default) |
| `snapshot_hash` | `text` not null | Stable SHA-256 of the canonical JSON payload |
| `payload` | `jsonb` not null | Full snapshot (matches `AnalyticsSnapshot` Zod schema in `lib/ai/schema.ts`) |
| `total_commits` | `integer` not null | |
| `total_prs` | `integer` not null | |
| `total_issues` | `integer` not null | |
| `total_repos` | `integer` not null | |
| `longest_streak` | `integer` not null | |
| `current_streak` | `integer` not null | |
| `most_active_day` | `text` | e.g. `Tuesday` |
| `most_active_hour_utc` | `smallint` | 0–23 |
| `top_language` | `text` | |
| `top_repository_id` | `bigint` | Nullable if user has no active repo |
| `activity_trend` | `text` check (`activity_trend in ('up','down','flat')`) | |
| `created_at` | `timestamptz` not null default `now()` | |

Indexes:
- `idx_snapshots_user_created` on `(user_id, created_at desc)`
- `idx_snapshots_hash` on `(user_id, snapshot_hash)` — AI cache lookup

### 4.9 `public.ai_insights` — Cached AI output

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` **PK** default `gen_random_uuid()` | |
| `user_id` | `uuid` not null | FK → `auth.users(id)` cascade |
| `snapshot_id` | `uuid` not null | FK → `analytics_snapshots(id)` cascade |
| `snapshot_hash` | `text` not null | Copy of the snapshot's hash for O(1) cache lookup |
| `model` | `text` not null | e.g. `gpt-4o-mini` |
| `development_style` | `text` not null | |
| `technology` | `text` not null | |
| `consistency` | `text` not null | |
| `recommendations` | `jsonb` not null | `string[]` |
| `tokens_used` | `integer` | |
| `latency_ms` | `integer` | |
| `generated_at` | `timestamptz` not null default `now()` | |
| `expires_at` | `timestamptz` not null | `generated_at + interval '24 hours'` |

Indexes:
- `idx_ai_insights_user_hash_fresh` on `(user_id, snapshot_hash, expires_at desc)` — cache hit path
- Unique `(user_id, snapshot_hash)` — one insight per snapshot version

### 4.10 `public.sync_runs` — Sync audit log

Tracks every full/partial sync execution for debugging + backoff decisions.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` **PK** default `gen_random_uuid()` | |
| `user_id` | `uuid` not null | FK → `auth.users(id)` cascade |
| `kind` | `text` not null check (`kind in ('full','partial','manual')`) | |
| `status` | `text` not null check (`status in ('running','success','failed','partial')`) | |
| `started_at` | `timestamptz` not null default `now()` | |
| `finished_at` | `timestamptz` | |
| `steps` | `jsonb` not null default `'[]'::jsonb` | Array of `{name, status, ms, error?}` |
| `github_rate_remaining` | `integer` | Snapshot of `x-ratelimit-remaining` at end |
| `error_message` | `text` | User-safe copy |

Indexes:
- `idx_sync_runs_user_started` on `(user_id, started_at desc)`

---

## 5. Row-Level Security (RLS) Policies

### 5.1 Enable RLS on every user-owned table
```sql
alter table public.profiles              enable row level security;
alter table public.github_profiles       enable row level security;
alter table public.repositories          enable row level security;
alter table public.repository_languages  enable row level security;
alter table public.contribution_days     enable row level security;
alter table public.activity_events       enable row level security;
alter table public.analytics_snapshots   enable row level security;
alter table public.ai_insights           enable row level security;
alter table public.sync_runs             enable row level security;
alter table public.github_credentials    enable row level security;
```

### 5.2 Policy template — owner read/write
For each user-owned table (except `github_credentials` and public-profile reads):

```sql
create policy "owner_select" on public.<table>
    for select using (auth.uid() = user_id);
create policy "owner_insert" on public.<table>
    for insert with check (auth.uid() = user_id);
create policy "owner_update" on public.<table>
    for update using (auth.uid() = user_id)
                with check (auth.uid() = user_id);
create policy "owner_delete" on public.<table>
    for delete using (auth.uid() = user_id);
```

### 5.3 Public profile read policies
`/u/[login]` is public when `profiles.is_public = true`. Anonymous readers get filtered views:

```sql
-- profiles: anyone can read public profiles
create policy "public_profile_select" on public.profiles
    for select using (is_public = true);

-- github_profiles / repositories / repository_languages / contribution_days:
-- anonymous read allowed only when the owner's profile is public.
create policy "public_github_profile_select" on public.github_profiles
    for select using (
        exists (
            select 1 from public.profiles p
            where p.user_id = github_profiles.user_id and p.is_public = true
        )
    );

-- repeat pattern for repositories, repository_languages, contribution_days
-- (activity_events + analytics_snapshots + ai_insights + sync_runs + github_credentials
--  are owner-only; never publicly readable).
```

### 5.4 Credential lockdown
`github_credentials` has **no** SELECT policy for the `anon` or `authenticated` roles. Access is only via server-only helpers using the `service_role` key. Encrypted at rest (`pgp_sym_encrypt`), decrypted only in server code with `SUPABASE_TOKEN_ENCRYPTION_KEY`.

```sql
revoke all on public.github_credentials from anon, authenticated;
```

---

## 6. Triggers & Functions

### 6.1 `updated_at` maintenance
```sql
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- apply to each table with updated_at:
create trigger trg_touch_<table>
before update on public.<table>
for each row execute function public.touch_updated_at();
```

### 6.2 Auto-create `profiles` row on signup
```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

### 6.3 Encryption helpers (server-only)
Not stored as SQL functions in the DB — implemented in `lib/crypto.ts` using `pgp_sym_encrypt`/`pgp_sym_decrypt` invoked via parameterized SQL. Rationale: keeps the encryption key strictly in the Node runtime env.

---

## 7. Retention & Data Lifecycle

| Table | Retention | Cleanup |
|---|---|---|
| `github_profiles`, `repositories`, `repository_languages`, `contribution_days`, `activity_events` | Overwritten on next sync; latest snapshot always present | No cleanup job (upsert-only) |
| `analytics_snapshots` | Keep last 30 per user | Nightly `pg_cron` job (Phase 10+) — **not** in MVP; unbounded is acceptable for portfolio scale |
| `ai_insights` | Keep last 30 per user; TTL check on `expires_at` for cache hit | Same as above |
| `sync_runs` | Keep 90 days | Optional nightly cleanup |

All deletions cascade from `auth.users.delete()`, so a user-initiated account deletion (post-MVP feature) will wipe every DevPulse row.

---

## 8. Query Patterns (informative)

### 8.1 Dashboard first load (single user)
```sql
-- 1) Profile + GitHub identity
select p.*, gp.*
from public.profiles p
join public.github_profiles gp using (user_id)
where p.user_id = auth.uid();

-- 2) Overview cards — latest snapshot
select total_commits, total_prs, total_issues, total_repos
from public.analytics_snapshots
where user_id = auth.uid()
order by created_at desc
limit 1;

-- 3) Activity chart (30D)
select day, commits, pull_requests, issues
from public.activity_events
where user_id = auth.uid()
  and day >= (current_date - interval '30 days')
order by day asc;

-- 4) Heatmap (52 weeks)
select day, contributions, level
from public.contribution_days
where user_id = auth.uid()
  and day >= (current_date - interval '52 weeks')
order by day asc;

-- 5) Top repos
select id, name, description, stargazers_count, forks_count, primary_language, html_url
from public.repositories
where user_id = auth.uid()
order by stargazers_count desc
limit 6;

-- 6) Language mix (top 5 + Other bucket computed in TS)
select language, sum(bytes) as total_bytes
from public.repository_languages
where user_id = auth.uid()
group by language
order by total_bytes desc
limit 10;
```

### 8.2 AI insight cache lookup
```sql
select *
from public.ai_insights
where user_id = auth.uid()
  and snapshot_hash = $1
  and expires_at > now()
order by generated_at desc
limit 1;
```

### 8.3 Public profile (anonymous)
```sql
-- Guarded by is_public via RLS
select p.github_login, p.display_name, p.bio, p.avatar_url,
       gp.public_repos, gp.followers, gp.following, gp.github_created_at
from public.profiles p
join public.github_profiles gp using (user_id)
where p.github_login = $1
  and p.is_public = true;
```

---

## 9. Migration Plan (Phase 3 delivery)

1. Enable extensions (`uuid-ossp`, `pgcrypto`, `citext`) via Supabase MCP `apply_migration`.
2. Author `lib/db/schema.ts` (Drizzle) mirroring §4 exactly.
3. `drizzle-kit generate` → `drizzle/0000_init.sql`.
4. Manually append RLS `enable` statements + policies from §5 to the generated SQL (Drizzle does not emit RLS).
5. Append triggers from §6 to the same migration.
6. Apply via Supabase MCP `apply_migration('0000_init', <sql>)`.
7. Verify with Supabase MCP `list_tables` and a `select ... from pg_policies where schemaname = 'public'` sanity check.

Subsequent changes go through the same pattern: `drizzle-kit generate` → append hand-written RLS/trigger deltas → `apply_migration`.

---

## 10. Zod Type Alignment

The `analytics_snapshots.payload` column is authored to match `AnalyticsSnapshot` Zod shape in `lib/ai/schema.ts` (Phase 5 & 8). Any change to that schema **must** ship in the same PR as:
- a migration bumping schema version if columns are added/removed,
- an update to `Tech.md §8` and `DB.md §4.8`,
- a new `analytics_snapshots` row generated for each existing user on next sync (no backfill needed thanks to overwrite-latest pattern).

---

## 11. Non-Goals (schema-level)

To keep MVP tight, these are **explicitly not** in the schema:
- No `organizations`, `teams`, `members` tables.
- No `subscriptions`, `billing_events`, `usage_quota`.
- No `notifications`, `email_events`.
- No webhook receiver tables (`github_webhook_deliveries`).
- No `repository_commits` per-commit granularity — daily aggregation is enough for every MVP chart.

Any of these can be added later as isolated migrations without disturbing the current shape.
