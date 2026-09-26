# DevPulse — Architecture & Technical Implementation

> **Version:** 1.0
> **Companion docs:** `PRD.md`, `DB.md`
> **Last updated:** 2026-09-26

This document describes **how** we will build DevPulse: the stack, the services, the data flow, and the phase-by-phase implementation plan. It also inventories what is **already installed** in the repo so we don't re-decide or reinstall.

---

## 1. Repo State — Already Installed & Configured

The repository is **not empty**. The following is already in place and we build on top of it.

### 1.1 Runtime & tooling
| Item | Version | Notes |
|---|---|---|
| **Next.js** | `16.3.6` (App Router) | ⚠️ Next 16 renames `middleware.ts` → **`proxy.ts`** (already present at repo root). AGENTS.md requires reading `node_modules/next/dist/docs/` before writing code. |
| **React** | `19.2.8` | Server Components + Server Actions available. |
| **TypeScript** | `^5` | `tsconfig.json` in repo (verify `strict` on). |
| **Tailwind CSS** | `v4` | Via `@tailwindcss/postcss`. |
| **ESLint** | `^9` | `eslint-config-next` v16. |
| **Package manager** | npm (per `package-lock.json`) | Decision record says `pnpm` — see §1.5 divergence note. |

### 1.2 UI stack
| Item | Version | Notes |
|---|---|---|
| **shadcn** CLI | `^4.21.0` | Set up via `components.json`. |
| **shadcn preset** | `style: base-mira`, `baseColor: mist`, `rsc: true`, `tsx: true` | **`iconLibrary: phosphor`** — see §1.5. |
| **@base-ui/react** | `^1.8.0` | Required by `base-mira` shadcn style. |
| **@phosphor-icons/react** | `^2.1.10` | Preset default. |
| **class-variance-authority** | `^0.7.1` | For variant helpers. |
| **cn** | `^0.4.0` | Class name helper. |
| **tw-animate-css** | `^1.4.0` | Imported in `app/globals.css`. |
| **Aliases** | `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks` | Defined in `components.json`. |
| **Registered registries** | `@supabase` → `https://supabase.com/ui/r/{name}.json` | Enables `shadcn add @supabase/<block>`. |
| **UI primitives present** | `button`, `card`, `input`, `label` | In `components/ui/`. |
| **Fonts** | Geist Sans, Geist Mono, IBM Plex Sans, Space Grotesk | Wired in `app/layout.tsx` via `next/font/google`. |
| **Theme tokens** | Dark tokens in `app/globals.css` (`.dark`) | Currently green-tinted primary; palette is **not yet** the DevPulse `#080B12` background — Phase 1 will retune. |

### 1.3 Auth & backend
| Item | Version | Notes |
|---|---|---|
| **@supabase/ssr** | `^0.12.7` | Server / browser / middleware clients already implemented in `lib/`. |
| **@supabase/supabase-js** | `^2.117.2` | Used implicitly by `@supabase/ssr`. |
| **Supabase project** | `mmvbuktxfjmdcfyswocb.supabase.co` | Env vars in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). |
| **Supabase MCP** | Configured in `.cursor/mcp.json` (linked to that project ref) | We will use it for schema apply & queries during development. |
| **shadcn MCP** | Configured in `.cursor/mcp.json` | We will use it to pull new primitives. |
| **`lib/client.ts`** | Browser client factory | ✅ ready |
| **`lib/server.ts`** | Server client factory (RSC-safe cookie handling) | ✅ ready |
| **`lib/middleware.ts`** + **`proxy.ts`** | Session refresh + protected-route redirect | ✅ ready, redirects unauth users to `/auth/login`. Uses `supabase.auth.getClaims()`. |
| **Existing auth pages** | `/auth/login`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/update-password`, `/auth/sign-up-success`, `/auth/confirm`, `/auth/error` | ⚠️ **Email/password based**. We will replace with GitHub OAuth in Phase 2. |
| **Existing form components** | `login-form`, `sign-up-form`, `forgot-password-form`, `update-password-form`, `logout-button` | ⚠️ Will be replaced by a single `GitHubSignInButton` in Phase 2. |
| **`app/protected/page.tsx`** | Placeholder authenticated route | Will become `/dashboard`. |

### 1.4 To be installed (Phase 1–8)
| Package | Purpose | Phase |
|---|---|---|
| `drizzle-orm`, `drizzle-kit`, `pg` | DB schema, migrations, typed queries | 3 |
| `@octokit/rest`, `@octokit/graphql`, `@octokit/plugin-throttling`, `@octokit/plugin-retry` | GitHub API client | 4 |
| `zod` | Runtime schemas (analytics + AI I/O) | 5, 8 |
| `date-fns` | Date math for streaks/windows | 5 |
| `recharts` | Charts | 7 |
| `@tanstack/react-query` | Client cache for refresh/regenerate flows | 6 |
| `zustand` | Minimal UI state (sidebar, palette, filters) | 6 |
| `cmdk` (via shadcn `command`) | ⌘K palette | 9 |
| `framer-motion` | Suptle transitions | 9 |
| `ai`, `@ai-sdk/openai` | Vercel AI SDK + OpenAI provider | 8 |
| `@sentry/nextjs` | Error monitoring | 10 |
| `@vercel/analytics`, `@vercel/speed-insights` | Product + web-vitals analytics | 10 |
| `vitest`, `@vitest/coverage-v8` | Unit tests for analytics pipeline | 5+ |
| `@playwright/test` | Smoke E2E (auth → dashboard) | 10 |

### 1.5 Divergences from 50-question decision record (documented on purpose)

1. **Icon library.** Decision record answered **lucide**, but the shadcn preset (`components.json`) is `iconLibrary: phosphor` and `@phosphor-icons/react` is already installed. Workspace rule (`.cursor/rules/shadcn-ui-rules.mdc`) says *"Always check for the shadcn preset and use preset from components.json"* — so **DevPulse uses Phosphor icons**. This aligns with the preset and avoids duplicate icon libs.
2. **Package manager.** Repo currently has `package-lock.json` (npm). Decision record chose `pnpm`. **We will migrate to pnpm in Phase 1** (delete `package-lock.json`, generate `pnpm-lock.yaml`, add `packageManager` field to `package.json`). Trivial one-time switch.
3. **Auth surface.** Existing `/auth/*` pages are email/password. Per decision record §Q13 (`github_only`) they will be **removed or rewritten** in Phase 2 — only `/auth/error` and `/auth/callback` remain.
4. **Dark palette.** `app/globals.css` currently has a generic OKLCH dark theme. Phase 1 retunes tokens so `--background` maps to the `#080B12` family and `--primary` becomes the DevPulse accent (see §6.1).

---

## 2. Selected Stack (final)

### 2.1 Frontend & runtime
- **Next.js 16 (App Router)** — RSC everywhere by default, Server Actions for mutations.
- **React 19**, **TypeScript strict**, **Tailwind v4**.
- **Node 22 LTS** runtime on Vercel.
- **shadcn/ui** + **Radix / Base UI** primitives (preset: `base-mira` / `mist` / Phosphor).
- **Recharts** for charts, wired through shadcn `Chart` preset for consistent theming.
- **Framer Motion** for micro-transitions.
- **TanStack Query** for client-side revalidation of refresh & regenerate flows.
- **Zustand** for lightweight UI state (sidebar, ⌘K palette, active filters).

### 2.2 Backend & data
- **Supabase Auth** with the **GitHub OAuth provider**. Scopes: `read:user`, `user:email`.
- **Supabase Postgres** as the single source of truth (see `DB.md`).
- **Drizzle ORM** for typed queries + `drizzle-kit` for migrations. `supabase-js` retained only for Auth.
- **Row-Level Security (RLS)** on every user-owned table (see `DB.md §Security`).
- **pgcrypto** for encrypting GitHub `provider_token` at rest.

### 2.3 External APIs
- **GitHub REST v3** via `@octokit/rest` — profile, repos, languages, commit stats.
- **GitHub GraphQL v4** via `@octokit/graphql` — `viewer.contributionsCollection.contributionCalendar` (heatmap, streaks) + aggregated PR/issue counts.
- **OpenAI** (`gpt-4o-mini` or `gpt-4.1-mini`) via **Vercel AI SDK** — structured Insights output via Zod.

### 2.4 Infrastructure
- **Vercel** for hosting (App Router, Fluid Compute, Image Optimization).
- **Supabase** cloud for DB + Auth.
- **Sentry** for error monitoring.
- **Vercel Analytics** + Speed Insights for product & web-vitals telemetry.

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Browser                                     │
│  Next.js App Router pages (RSC + client components)                      │
│  TanStack Query · Zustand · Framer Motion                                │
└─────────────┬─────────────────────────────────────────┬─────────────────┘
              │                                         │
              │ RSC render / Server Action              │ Streaming AI (SSE)
              ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Next.js server (Vercel Fluid)                         │
│                                                                          │
│  proxy.ts (Supabase session refresh + protected-route redirect)          │
│  app/**/page.tsx (RSC)  ── reads via Drizzle                             │
│  app/**/actions.ts       ── writes/refreshes via Drizzle + Octokit       │
│  app/api/insights/route.ts ── AI streaming endpoint                      │
│                                                                          │
│  lib/                                                                    │
│    ├─ supabase/  (client, server, middleware)                            │
│    ├─ db/        (drizzle client, schema)                                │
│    ├─ github/    (octokit factory, rate-limit queue, mappers)            │
│    ├─ analytics/ (pure TS: streaks, top-repo, language%, etc.)           │
│    └─ ai/        (zod schema, prompt, model call)                        │
└──────────┬─────────────────────┬──────────────────────────┬──────────────┘
           │                     │                          │
           ▼                     ▼                          ▼
   ┌──────────────┐      ┌──────────────┐         ┌──────────────────┐
   │  Supabase    │      │  GitHub API  │         │   OpenAI API     │
   │  Postgres +  │      │  REST + GQL  │         │ (via AI SDK)     │
   │  Auth (RLS)  │      │              │         │                  │
   └──────────────┘      └──────────────┘         └──────────────────┘
```

Every dashboard render is a **Server Component** reading pre-synced data from Postgres — the browser never talks directly to GitHub or OpenAI. Only **mutations** (initial sync, manual refresh, regenerate insights) call external APIs, all from server-only code.

---

## 4. Directory Layout (target end-state)

```
dev_pulse/
├── app/
│   ├── (marketing)/
│   │   └── page.tsx                 # Landing (hero + Sign in with GitHub)
│   ├── auth/
│   │   ├── callback/route.ts        # OAuth exchange (code → session)
│   │   └── error/page.tsx           # Friendly error surface
│   ├── (app)/                       # Group under Supabase auth guard
│   │   ├── layout.tsx               # Sidebar + header shell
│   │   ├── dashboard/page.tsx
│   │   ├── repositories/page.tsx
│   │   ├── activity/page.tsx
│   │   ├── insights/page.tsx
│   │   ├── settings/page.tsx
│   │   └── actions/
│   │       ├── sync.ts              # Server Action: full/partial GitHub sync
│   │       └── regenerate-insights.ts
│   ├── u/[username]/
│   │   ├── page.tsx                 # Public profile
│   │   └── opengraph-image.tsx      # Dynamic OG image
│   ├── api/
│   │   └── insights/route.ts        # AI streaming route (POST)
│   ├── layout.tsx
│   ├── globals.css                  # Tokens retuned in Phase 1
│   └── not-found.tsx
├── components/
│   ├── ui/                          # shadcn primitives
│   ├── layout/                      # AppShell, Sidebar, Header
│   ├── dashboard/                   # OverviewCards, ActivityChart, Heatmap, TopRepos
│   ├── repositories/                # RepoCard, RepoFilters
│   ├── insights/                    # InsightSection, RegenerateButton
│   ├── command/                     # CommandPalette (⌘K)
│   └── shared/                      # Skeletons, EmptyState, ErrorState
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── db/
│   │   ├── index.ts                 # Drizzle client (Postgres pool)
│   │   └── schema.ts                # All tables (see DB.md)
│   ├── github/
│   │   ├── octokit.ts               # Client factory with throttling + retry plugins
│   │   ├── queue.ts                 # p-queue instance, rate-limit aware
│   │   ├── fetchers.ts              # High-level fetchers (profile, repos, contributions, langs)
│   │   └── mappers.ts               # GitHub payload → DB row shape
│   ├── analytics/
│   │   ├── streaks.ts
│   │   ├── activity-timeseries.ts
│   │   ├── language-mix.ts
│   │   ├── top-repo.ts
│   │   └── snapshot.ts              # Build the AnalyticsSnapshot used by AI
│   ├── ai/
│   │   ├── schema.ts                # Zod output schema
│   │   ├── prompt.ts                # System prompt (guardrails)
│   │   └── generate.ts              # streamObject wrapper
│   ├── crypto.ts                    # pgcrypto helpers (server-only)
│   ├── utils.ts
│   └── safe-next-path.ts            # existing
├── drizzle/                         # Generated SQL migrations
│   └── 0000_init.sql
├── supabase/
│   └── migrations/                  # Mirror of drizzle output, applied via Supabase MCP
├── tests/
│   ├── analytics/*.test.ts          # Vitest unit tests
│   └── e2e/auth.spec.ts             # Playwright smoke
├── docs/
│   ├── PRD.md
│   ├── Tech.md                      # ← this file
│   └── DB.md
├── proxy.ts                         # Next 16 middleware equivalent (present)
├── next.config.ts
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── components.json                  # shadcn preset (present)
├── package.json
└── AGENTS.md / CLAUDE.md            # present
```

---

## 5. Key Flows

### 5.1 Sign-in flow (GitHub OAuth via Supabase)

```
User → /auth/login (single "Sign in with GitHub" button)
     → supabase.auth.signInWithOAuth({ provider: 'github',
                                       options: { scopes: 'read:user user:email',
                                                  redirectTo: '/auth/callback?next=/dashboard' } })
     → GitHub authorize screen
     → GitHub redirects → /auth/callback?code=...
     → Route handler: supabase.auth.exchangeCodeForSession(code)
     → Supabase returns access_token + provider_token
     → Server Action: encryptAndStore(provider_token) into github_credentials
     → Redirect to /dashboard
     → RSC checks if user has an AnalyticsSnapshot; if not → run initial sync
```

`proxy.ts` continues to guard authenticated routes (already implemented, keeps working after we swap sign-in method).

### 5.2 Initial sync flow (first login)

```
Dashboard RSC detects: no analytics_snapshot for user
     → Redirect to /onboarding (with progress UI, streaming Server Action logs)
     → Server Action full-sync():
          1. fetchProfile()              (REST)
          2. fetchRepos()                (REST, paged)
          3. for repo in repos: fetchLanguages(repo)   (REST, queued)
          4. fetchContributionCalendar() (GraphQL, single call — 52 weeks)
          5. fetchRecentEvents(90d)      (REST, for commit timing)
          6. persist all → Postgres
          7. compute analytics-snapshot  (pure TS)
          8. persist snapshot
     → Redirect to /dashboard
```

Each step reports progress via a streaming Server Action (React 19 `useActionState` + async iterable).

### 5.3 Manual refresh flow (after first sync)

```
User clicks "Refresh" in header
     → Server Action refresh():
          - For each cached entity, compare updated_at against TTL (see PRD §6.9)
          - Refetch only stale entities
          - Recompute analytics-snapshot
          - Invalidate TanStack Query cache on client
```

### 5.4 AI Insights flow

```
Dashboard: <RegenerateButton /> → POST /api/insights
Route handler (server-only):
     1. Load latest analytics_snapshot from DB
     2. Compute snapshot_hash (stable JSON)
     3. If ai_insights row with matching hash and age < 24h → return cached JSON
     4. Else:
        - streamObject({ model: openai('gpt-4o-mini'),
                         schema: InsightsSchema,
                         system: DEVPULSE_SYSTEM_PROMPT,
                         prompt: JSON.stringify(snapshot) })
        - Stream to client via useObject() on the button
        - On completion: upsert ai_insights row (snapshot_hash + payload)
```

Guardrails in the system prompt:
> "You are DevPulse Insights. Only make claims that are directly supported by the numbers in the provided JSON. Do not invent repos, languages, dates, or trends. If the data is insufficient (e.g. < 10 total commits), say so explicitly in each affected field. Keep each paragraph to 2–3 sentences. Recommendations must be phrased as suggestions, never as objective judgments."

### 5.5 Public profile flow

```
GET /u/[username]
  → RSC:
      1. Lookup user by github_login (case-insensitive) in `github_profiles`
      2. If not found or is_public=false → notFound()
      3. Read cached profile, top repos (top 6 by stars), language mix, 52w heatmap
      4. Render (same components as dashboard, read-only)
GET /u/[username]/opengraph-image
  → ImageResponse rendering avatar + name + 3 headline stats + top language chips
```

---

## 6. UI System Details

### 6.1 Theme tokens (Phase 1 retune)

The current `app/globals.css` dark tokens will be adjusted so:
```
--background:       oklch(0.107 0.010 260)   /* ≈ #080B12  */
--foreground:       oklch(0.965 0.005 240)
--card:             oklch(0.145 0.010 258)   /* subtle surface lift */
--border:           oklch(1 0 0 / 8%)
--primary:          oklch(0.72 0.15 250)     /* restrained blue accent */
--primary-foreground: oklch(0.98 0 0)
--chart-1..5:       tuned to accent + 4 desaturated neighbors
```

Light theme stays defined but is unused (dark-only in MVP). We keep `.dark` selector active on `<html>` and remove any `light`/`system` toggle.

### 6.2 Component sourcing rules (enforced)
- All primitives via `shadcn add <name>` using the current `base-mira` preset.
- Never hand-roll `Button`, `Input`, `Dialog`, `Select`, `Popover`, `Tooltip`, `Sheet`, `Command`, `Skeleton`, `Tabs`, `Toggle`, `Table`, `Chart` — pull them via the shadcn MCP so registries and tokens stay consistent.
- Charts: use shadcn `Chart` wrapper around Recharts for token-aware theming.
- Icons: `@phosphor-icons/react` only.

### 6.3 Responsive behavior
- **≥ 1280px:** sidebar (240px) + main.
- **768–1279px:** sidebar collapses to icon rail (64px).
- **< 768px:** sidebar becomes a bottom sheet (`Sheet`); overview cards stack; charts become horizontally scrollable; heatmap becomes a 12-week compact strip.

---

## 7. GitHub API Strategy

- Single Octokit factory `lib/github/octokit.ts` with `@octokit/plugin-throttling` and `@octokit/plugin-retry` enabled.
- `provider_token` decrypted per request in server code only; never sent to the client.
- All calls flow through `lib/github/queue.ts` (a p-queue with concurrency=4).
- Conditional requests: pass `If-None-Match` where applicable (repos list) to reduce quota usage.
- Rate-limit metadata (`x-ratelimit-remaining`, `x-ratelimit-reset`) exposed on a `/settings` debug row.
- GraphQL is used **only** for `contributionsCollection` (calendar + streak) — one call replaces dozens of REST calls.

---

## 8. AI Layer

- **SDK:** `ai` + `@ai-sdk/openai`.
- **Model:** `gpt-4o-mini` (fallback: `gpt-4.1-mini`). Configurable via env var `OPENAI_INSIGHTS_MODEL`.
- **Interface:** `streamObject({ model, schema, system, prompt })` — schema-first, so partial streaming is type-safe on the client via `useObject`.
- **Input shape** (`AnalyticsSnapshot`, Zod-defined):
  ```ts
  {
    totalCommits, totalPRs, totalIssues, totalRepos,
    topLanguages: [{ language, percentage }],
    mostActiveDay, mostActiveHourUTC,
    longestStreak, currentStreak,
    topRepositories: [{ name, commitsLast90d, stars }],
    activityTrend: 'up' | 'down' | 'flat',
    windowDays: 365
  }
  ```
- **Output shape** — see PRD §6.8.
- **Cache table:** `ai_insights` keyed by `(user_id, snapshot_hash)`; TTL 24h; regenerate forces bypass.
- **Observability:** every insight generation logs `{userId, tokensUsed, latencyMs, model}` to Sentry breadcrumbs (no PII, no snapshot content).

---

## 9. Security

- **RLS on every user-owned table** (`DB.md §Security`). Server code uses a **service-role client only in server-only files** (`lib/db/*`, Server Actions, route handlers) — never in Client Components.
- **GitHub token** is stored in `github_credentials.provider_token_encrypted` (pgcrypto `pgp_sym_encrypt` with a key from `SUPABASE_TOKEN_ENCRYPTION_KEY` env var).
- **Never expose** `provider_token` to the client. All GitHub calls happen server-side.
- **CSRF:** Server Actions carry Next 16's built-in origin check; API routes verify Supabase session.
- **Secrets:** `.env.local` for dev; Vercel Encrypted Env for prod.

---

## 10. Environment Variables

| Var | Scope | Purpose | Present? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL | ✅ `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | Publishable anon key | ✅ `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Service role for admin ops (Drizzle over PG uses `DATABASE_URL` — this is only for admin auth ops) | ❌ add in Phase 2 |
| `DATABASE_URL` | server-only | Supabase **transaction** pooler (`:6543`) for Drizzle runtime in Next.js | ✅ `.env.local` (URL-encode password if it contains `?` `@` etc.) |
| `DIRECT_URL` | server-only | Supabase **session** pooler (`:5432`) for `drizzle-kit push` / studio (IPv4-friendly on Windows) | ✅ `.env.local` |
| `SUPABASE_TOKEN_ENCRYPTION_KEY` | server-only | Key for pgcrypto `pgp_sym_encrypt` | ❌ add in Phase 2 |
| `OPENAI_API_KEY` | server-only | AI insights | ❌ add in Phase 8 |
| `OPENAI_INSIGHTS_MODEL` | server-only | Model override (default `gpt-4o-mini`) | ❌ add in Phase 8 |
| `SENTRY_DSN` | server + client | Error monitoring | ❌ add in Phase 10 |
| `NEXT_PUBLIC_SITE_URL` | client + server | Canonical URL for OAuth redirects & OG images | ❌ add in Phase 2 |

---

## 11. Observability & Quality

- **Sentry:** wraps Server Actions, route handlers, and the AI call. Breadcrumbs for GitHub API errors with sanitized status codes.
- **Vercel Analytics + Speed Insights:** page views, CWV, funnel from landing → dashboard.
- **Testing:**
  - Vitest for `lib/analytics/*` (pure functions — highest coverage priority).
  - Playwright smoke: landing → GitHub OAuth mock → dashboard renders with seeded data.
  - No component-level testing in MVP.
- **Lint / typecheck** run in CI on every PR (Vercel preview also fails on TS errors).

---

## 12. Deployment

- **Vercel project** connected to this repo.
- Two environments: `Preview` (per branch) and `Production` (main).
- Supabase environment mirrored: dev branch DB is Supabase branch preview; prod is main Supabase project.
- Custom domain optional in Phase 10.
- **Fluid Compute** enabled — matches Supabase SSR guidance ("Always create a new client within each function", already noted in `lib/server.ts`).

---

## 13. Roadmap — Phase-by-Phase Implementation

Each phase must be **complete and verifiable** before starting the next (per PRD §10).

### Phase 1 — Foundation (½ day)
- Read `node_modules/next/dist/docs/` App Router + caching + server-actions references (per AGENTS.md).
- Migrate npm → pnpm (`pnpm import` from lockfile; delete `package-lock.json`; add `packageManager` field).
- Retune `app/globals.css` dark tokens to `#080B12` palette + accent (see §6.1).
- Rewrite `app/layout.tsx` metadata (title = "DevPulse", description, `openGraph`, Twitter card).
- Delete or replace default `app/page.tsx` boilerplate with landing hero.
- Enable `strict` and `noUncheckedIndexedAccess` in `tsconfig.json` (verify).
- Add `docs/` (this doc + PRD.md + DB.md).
- ✅ Exit criteria: dev server boots, dark theme matches spec on a placeholder page.

### Phase 2 — Auth (½ day)
- Add GitHub OAuth provider in Supabase Dashboard (via Supabase MCP), redirect URL = `${NEXT_PUBLIC_SITE_URL}/auth/callback`.
- Replace `app/auth/{login,sign-up,forgot-password,update-password,sign-up-success,confirm}` with a single `/auth/login/page.tsx` containing one `<GitHubSignInButton />`.
- Add `app/auth/callback/route.ts` (`exchangeCodeForSession` + token capture).
- Keep and lightly redesign `app/auth/error/page.tsx`.
- Delete unused form components.
- Add `SUPABASE_TOKEN_ENCRYPTION_KEY` env var; store provider_token encrypted (temp table until Phase 3).
- ✅ Exit criteria: signing in via GitHub lands on `/dashboard` placeholder.

### Phase 3 — Database (½ day)
- Install `drizzle-orm`, `drizzle-kit`, `pg`.
- Add `drizzle.config.ts` pointing at `DIRECT_URL` (session pooler); runtime `lib/db` uses `DATABASE_URL` (transaction pooler `:6543`).
- Author `lib/db/schema.ts` from `DB.md`.
- Generate `drizzle/0000_init.sql`; apply via Supabase MCP (`apply_migration`).
- Enable RLS + policies on every table.
- Enable `pgcrypto`.
- ✅ Exit criteria: `pnpm drizzle-kit push` succeeds; Supabase MCP `list_tables` shows all DevPulse tables with RLS enabled.

### Phase 4 — GitHub sync (1 day)
- `lib/github/octokit.ts` with throttling + retry plugins.
- `lib/github/fetchers.ts`: `fetchProfile`, `fetchRepos`, `fetchLanguages`, `fetchContributionCalendar`, `fetchRecentEvents`.
- `lib/github/mappers.ts`: payload → DB rows.
- Server Action `app/(app)/actions/sync.ts` orchestrating full + partial syncs.
- Onboarding page consuming streaming progress.
- ✅ Exit criteria: real GitHub account fully synced into Supabase; sync is idempotent.

### Phase 5 — Analytics engine (½ day)
- `lib/analytics/*.ts` pure functions.
- Vitest suite with fixtures covering: streaks (including gaps + timezone edge cases), language %, top repo, day/hour aggregations.
- Build `AnalyticsSnapshot` computed and cached in `analytics_snapshots`.
- ✅ Exit criteria: ≥ 90% coverage on `lib/analytics`.

### Phase 6 — Dashboard UI (1 day)
- Add shadcn primitives: `sheet`, `tabs`, `dropdown-menu`, `avatar`, `tooltip`, `separator`, `skeleton`, `sonner` (toast).
- `components/layout/AppShell` (sidebar + header + main).
- Overview cards, top-repos preview, recent activity list.
- TanStack Query provider + Zustand store.
- ✅ Exit criteria: dashboard displays real data end-to-end.

### Phase 7 — Charts + heatmap (½ day)
- Add shadcn `chart` preset + Recharts.
- `ActivityChart` (7D / 30D / 90D / 1Y toggle).
- `ContributionHeatmap` (custom SVG/CSS grid, 52 × 7).
- `LanguageDonut`.
- ✅ Exit criteria: all three renders match GitHub's own visuals in structure.

### Phase 8 — AI Insights (½ day)
- Add `ai`, `@ai-sdk/openai`, `zod`.
- `lib/ai/{schema,prompt,generate}.ts`.
- `app/api/insights/route.ts` using `streamObject`.
- `components/insights/InsightSection` with `useObject`.
- 24h cache + Regenerate button.
- ✅ Exit criteria: fresh insight is generated and streamed; regenerate replaces cache; error toast on failure.

### Phase 9 — Public profile + polish (½ day)
- `/u/[username]/page.tsx` + `opengraph-image.tsx` (`ImageResponse`).
- ⌘K palette via shadcn `command`.
- Framer Motion transitions for card mount + tab switch.
- Responsive breakpoints QA on desktop, tablet, mobile.
- ✅ Exit criteria: shareable URL works; palette navigates and searches repos.

### Phase 10 — Ship (½ day)
- Sentry setup (`@sentry/nextjs`).
- Vercel Analytics + Speed Insights.
- Playwright smoke test.
- Complete README (screenshots, arch diagram derived from §3, setup steps, env var table from §10).
- Push to Vercel production; verify prod deploy end-to-end.
- ✅ Exit criteria: all PRD §9 Definition-of-Done items check out.

---

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **GitHub rate limits** during initial sync for prolific users | Queue + throttling plugin; per-repo language calls capped; conditional requests. Show remaining budget in Settings. |
| **AI hallucinations** despite prompt guardrails | Zod schema + numeric-only input snapshot + explicit "insufficient data" fallback branch. Never quote repo names not in the snapshot. |
| **Supabase RLS misconfig** exposing data | Every table has explicit `select`/`insert`/`update` policies keyed on `auth.uid()`; automated policy tests before Phase 10. |
| **Next 16 API drift** vs. training data | AGENTS.md rule enforced: read `node_modules/next/dist/docs/` at each phase touching Next internals (proxy, caching, server actions, `ImageResponse`). |
| **OpenAI cost explosion** | 24h cache + regenerate throttling (min 60s between manual regenerates client-side, enforced server-side). |
| **shadcn preset drift** | Never edit primitives by hand; always re-generate via `shadcn add` using the preset. |

---

## 15. Documentation Cross-References

- Product requirements & feature scope → **`PRD.md`**
- Database schema, RLS policies, indexes, encryption → **`DB.md`**
- This document → architecture, stack, phases, ops

Any change to stack, phase order, or feature scope must be reflected in **all three** documents in the same PR.
