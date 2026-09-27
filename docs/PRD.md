# DevPulse — Product Requirements Document (PRD)

> **Version:** 1.0
> **Status:** Approved (locked after 50-question alignment)
> **Owner:** Strahinja
> **Last updated:** 2026-09-26

---

## 1. Product Summary

**DevPulse** is a developer analytics dashboard that turns a developer's public GitHub activity into a clear, visual, and actionable profile.

A user connects their GitHub account and instantly sees a personal dashboard covering repositories, commits, pull requests, issues, contribution activity, programming languages, development patterns, and an AI-generated "Developer Insights" report.

DevPulse is **not** a GitHub clone. Its single job is to answer:

> _"What does my GitHub activity actually say about the way I develop software?"_

The product must look and feel like a polished, dark-first SaaS tool comparable to Linear, Vercel, Raycast, or GitHub itself.

---

## 2. Goals & Non-Goals

### 2.1 Primary Goals
- Ship a visually impressive **portfolio-grade** full-stack project.
- Demonstrate end-to-end skills: Next.js RSC, external API integration, auth, Postgres, data processing, data visualization, AI, deployment.
- Use AI in a **non-gimmicky** way (structured, data-grounded insights).
- Maintain a clean, professional, restrained SaaS UI.

### 2.2 Secondary Goals
- Understandable within **10–20 seconds** on first visit.
- Small, polished feature set — quality over quantity.
- Keep the architecture simple and easily explainable in a README.

### 2.3 Non-Goals (explicitly out of scope for MVP)
- Team accounts, billing, subscriptions
- Notifications, mobile native app, admin dashboard
- Real-time GitHub sync (webhooks)
- GitHub organization-level analytics
- Recommendation engine beyond AI text suggestions
- Complex permissioning

---

## 3. Target User

Developers who want to understand their own GitHub activity:
- Students & junior developers
- Mid-level developers building a portfolio
- Open-source contributors
- Developers preparing for interviews

Personas share three needs: **self-awareness**, **shareable proof of activity**, **fast onboarding** (< 30 seconds from landing to dashboard).

---

## 4. Core User Flow

```
Landing Page
      ↓ [Sign in with GitHub]
GitHub OAuth (Supabase provider)
      ↓
First-time auto-sync (with progress screen)
      ↓
Dashboard (default view)
      ↓
Explore Activity / Repos / Languages / Insights
      ↓
Optional: share public profile at /u/[username]
```

The entire happy path from landing to a populated dashboard should complete in **≤ 15 seconds** for an average GitHub user.

---

## 5. Feature Scope (MVP)

### 5.1 Must-have
| # | Feature | Description |
|---|---|---|
| F1 | **GitHub OAuth login** | Single sign-in method via Supabase Auth (scopes: `read:user`, `user:email`). No manual username entry. |
| F2 | **First-time data sync** | On first login, fetch public profile, repos, contributions, languages. Show progress screen. Persist to DB. |
| F3 | **Dashboard header** | Personalized greeting (time-of-day), user avatar dropdown (settings, sign out). |
| F4 | **Overview cards** | Repositories, Total commits, Total PRs, Total issues — each with delta vs. previous period + tooltip. |
| F5 | **Activity chart** | Time-series of commits / PRs / issues over 7D / 30D / 90D / 1Y (Recharts). |
| F6 | **Contribution heatmap** | GitHub-style calendar heatmap from GraphQL `contributionsCollection`. Shows: total contributions, current streak, longest streak, most active day. |
| F7 | **Repository list** | Sortable (stars, updated, active, commits) + text search. Card shows: name, description, language breakdown bar, stars, forks. Links to GitHub. |
| F8 | **Languages breakdown** | Aggregated language usage across public repos with % chart (donut or bar). |
| F9 | **Development statistics** | Dedicated stats section: total commits, PRs, issues, most active repo (last 90d), most used language, most active day, most active hour, longest streak, avg commits per active day. |
| F10 | **AI Developer Insights** | 4 categories: **Development Style**, **Technology**, **Consistency**, **Recommendations**. Streamed to UI, cached 24h, regenerate button. |
| F11 | **Public profile page** | `/u/[username]` — GitHub info, main stats, top languages, top repos, contribution activity. Public by default with settings opt-out. |
| F12 | **Dynamic OG image** | Shareable OG image per user profile for social embeds. |
| F13 | **Command palette (⌘K)** | Fuzzy nav + repo search. |
| F14 | **Responsive UI** | Desktop-first; tablet & mobile reorganize cards/charts intelligently. Dark-only theme. |
| F15 | **Error, loading, empty states** | Friendly copy for OAuth failure, GitHub rate limits, AI failure, no repos, no activity. Skeletons for every data section. |
| F16 | **Deployed to production** | Vercel prod build with Supabase backend, custom domain optional. |

### 5.2 Should-not-have (post-MVP)
Team analytics, org insights, billing, notifications, private repo analytics, PDF/CSV export, i18n, light theme, real-time sync via webhooks, admin panel.

---

## 6. Detailed Feature Requirements

### 6.1 Authentication (F1, F2)
- **Provider:** Supabase Auth with GitHub OAuth provider.
- **Scopes requested:** `read:user`, `user:email` — public data only. **No** `repo` scope.
- **Session:** Supabase SSR cookie session (`@supabase/ssr`).
- **Token storage:** GitHub `provider_token` is stored **encrypted at rest** in `github_credentials` table (pgcrypto). Never exposed to the client.
- **Failure handling:** OAuth error → dedicated `/auth/error` page with plain-English cause and "Try again" button.
- **Logout:** Clears Supabase session cookie + local UI state.

### 6.2 Sync engine (F2, F4–F9)
- Trigger points:
  1. First login → forced full sync with progress UI.
  2. Manual "Refresh" button on dashboard.
  3. TTL-based revalidation on dashboard open (see §6.9).
- Rate limits: honor GitHub REST/GraphQL headers; use queue + exponential backoff; surface remaining limit in a debug tooltip on Settings page.
- **Public repos only** in MVP (opt-in for private is a post-MVP setting).

### 6.3 Activity chart (F5)
- Data source: aggregated `commit_events` / `pr_events` / `issue_events` grouped by day.
- Ranges: **7D, 30D, 90D, 1Y**.
- Comparison line (optional toggle): previous equivalent period.
- Empty state: "Not enough activity in this range."

### 6.4 Contribution heatmap (F6)
- Source of truth: GraphQL `viewer.contributionsCollection.contributionCalendar` (matches GitHub's own definition).
- Cells: 5-tier intensity, same visual grammar as GitHub.
- Sidebar metrics: **Total contributions (52w)**, **Current streak**, **Longest streak**, **Most active day** (Mon–Sun label).

### 6.5 Repository analytics (F7)
- Sorts: most stars, most active (recent push), recently updated, most commits.
- Search: client-side fuzzy filter (Fuse or built-in).
- Language bar: horizontal stacked bar with GitHub colors.
- Every card links to `https://github.com/<owner>/<repo>` in a new tab.

### 6.6 Languages breakdown (F8)
- Aggregate `languages` API per repo (bytes) → sum → percentage.
- Top 5 shown by name + %; remainder grouped as **Other**.
- Recomputed only when repo set changes or after full sync.

### 6.7 Development statistics (F9)
Only compute metrics that can be derived reliably from GitHub data. Definitions:
- **Total commits:** sum of authored commits (default branch) in the sync window.
- **Most active repository:** repo with most commits in the **last 90 days**.
- **Most used language:** highest aggregate byte count across all repos.
- **Most active day:** weekday with highest median commits.
- **Most active hour:** UTC hour with highest commit count (labeled with user's local zone if resolvable).
- **Longest streak / Current streak:** derived from GraphQL contribution calendar.
- **Avg commits per active day:** total commits ÷ number of days with ≥1 contribution.

Any metric that cannot be reliably derived is **omitted** — never faked.

### 6.8 AI Developer Insights (F10)
- **Model:** OpenAI (`gpt-4o-mini` or `gpt-4.1-mini`) via Vercel AI SDK `streamObject`/`generateObject`.
- **Input:** structured analytics snapshot (JSON) — not raw GitHub payloads.
- **Output schema (Zod):**
  ```ts
  {
    developmentStyle: string,   // 2–3 sentences
    technology: string,          // 2–3 sentences
    consistency: string,         // 2–3 sentences
    recommendations: string[]    // 3–5 short bullets, phrased as suggestions
  }
  ```
- **Guardrails:** system prompt enforces "Only make claims that are directly supported by the numbers provided. Do not invent activity, repos, or trends. If data is insufficient, say so explicitly."
- **Cache:** 24h TTL keyed by `(user_id, analytics_snapshot_hash)`. Regenerate button forces a fresh call and updates cache.
- **Failure:** friendly toast: "We couldn't generate insights right now. Please try again in a minute." Underlying error logged to Sentry.

### 6.9 Caching & freshness policy
| Data | TTL | Notes |
|---|---|---|
| GitHub profile | 60 min | Refreshed on Refresh click or after expiry |
| Repository list | 60 min | Same |
| Language bytes | 24 h | Expensive; rarely changes |
| Contribution calendar | 60 min | GraphQL single call |
| Commits / PRs / issues (aggregated) | 60 min | |
| AI insights | 24 h | Regenerate button available |

### 6.10 Public profile (F11, F12)
- URL: `/u/[github_username]` (case-insensitive route).
- Public by default; user can toggle off in Settings → "Public profile".
- When disabled: page returns 404 to non-owner viewers.
- Includes: avatar, name, bio, main stats, top languages (top 5), top repos (top 6 by stars), 52-week heatmap.
- **Dynamic OG image** at `/u/[username]/opengraph-image` — SSR via `ImageResponse`.

---

## 7. UX / Design Principles

- **Dark-first only**, base background `#080B12` (see Tech.md for exact tokens).
- **Restraint:** no gradients, no glassmorphism, minimal borders.
- **Typography-first hierarchy:** Geist Sans body, generous line-height, tight tracking on headings.
- **Motion:** Framer Motion, only 150–200ms fade/slide. No decorative animations.
- **Layout:** left sidebar + top header (Linear/Vercel style). Sidebar collapses on tablet, becomes bottom sheet on mobile.
- **Component discipline:** all primitives from shadcn/ui preset (`base-mira` / `mist` / **Phosphor icons**). No custom Button/Input/Dialog if a shadcn primitive exists.

---

## 8. Error, Loading & Empty States

### 8.1 Loading
- Every section (overview, chart, heatmap, repo list, insights) has a **skeleton**.
- Avoid full-page spinners except during initial post-login sync.

### 8.2 Errors — user-facing copy examples
| Trigger | Copy |
|---|---|
| GitHub 401 / expired token | "We couldn't refresh your GitHub data. Please reconnect your GitHub account." |
| GitHub 403 rate limit | "GitHub is throttling us. We'll retry automatically in a minute." |
| Network error | "Something went wrong loading this section. Retry?" |
| AI provider failure | "Insights aren't available right now. Please try again shortly." |
| No repos | "No public repositories found. Create your first GitHub repository to start building your DevPulse profile." |
| No activity | "Not enough GitHub activity to generate insights yet." |

Never show raw stack traces, HTTP status codes, or model IDs to the user.

---

## 9. Success Criteria (Definition of Done)

DevPulse ships when **all** of the following are true:
1. A user can sign in with GitHub and land on a populated dashboard in one flow.
2. All F1–F16 features from §5.1 are implemented and visible.
3. Every metric shown matches GitHub's own data within reasonable tolerance (spot-check 3 accounts).
4. AI insights only reference numbers present in the snapshot input.
5. Every network dependency has a friendly error path.
6. Every data section has a skeleton and empty state.
7. Dashboard passes Lighthouse mobile & desktop ≥ 90 for Performance and Accessibility.
8. Deployed to Vercel production behind a stable URL.
9. README contains: screenshots, feature list, architecture diagram, local setup instructions, env variable list.
10. First-time visitor can articulate what DevPulse does in 10–20 seconds.

---

## 10. Development Phases (roadmap)

Reference — full technical breakdown lives in `Tech.md §Roadmap`.

1. **Phase 1** — Foundation (Next 16 App Router baseline, shadcn preset, dark theme tokens).
2. **Phase 2** — Auth (replace email/password scaffolding with Supabase GitHub OAuth).
3. **Phase 3** — DB schema + Supabase migrations (see `DB.md`).
4. **Phase 4** — GitHub sync engine (Octokit REST + GraphQL, queue, rate limits).
5. **Phase 5** — Analytics pipeline (pure TS functions + Vitest).
6. **Phase 6** — Dashboard UI (sidebar layout, overview cards, top-repos preview, states).
6b. **Phase 6b** — Repository list (**F7**: sort, search, language bar on `/repositories`).
7. **Phase 7** — Charts + heatmap + languages breakdown (**F5, F6, F8, F9** on dashboard).
8. **Phase 8** — AI Insights (Vercel AI SDK, Zod, cache; **`/insights`**).
9. **Phase 9** — Public profile + OG image + ⌘K palette + **`/settings`**.
10. **Phase 10** — Ship (Sentry, Playwright smoke, README, prod deploy).

Each phase is independently verifiable and must be complete before starting the next.

---

## 11. Open Questions & Assumptions

- **Assumption:** Users have public GitHub activity. Accounts with fully private history will show an "empty" experience (documented empty state).
- **Assumption:** GitHub personal accounts only (no org sign-in flow in MVP).
- **Open:** Custom domain for production (deferred to Phase 10).
- **Open:** Whether Regenerate button on AI insights should cost the user a "quota" (deferred — no rate limiting for MVP; monitor OpenAI spend).
