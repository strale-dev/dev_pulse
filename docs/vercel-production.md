# Vercel production — DevPulse

Production URL: `https://dev-pulse-delta-ten.vercel.app`

## Environment variables

Copy values from local `.env.local`. On Vercel:

| Variable | Vercel type | Environments |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Config (plain) | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config (plain) | Production, Preview |
| `NEXT_PUBLIC_SITE_URL` | Config (plain) | Production → `https://dev-pulse-delta-ten.vercel.app` |
| `DATABASE_URL` | Secret | Production, Preview |
| `DIRECT_URL` | Secret | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Production, Preview |
| `SUPABASE_TOKEN_ENCRYPTION_KEY` | Secret | Production, Preview |
| `OPENAI_API_KEY` | Secret | Production, Preview |
| `OPENAI_INSIGHTS_MODEL` | Config or Secret | optional |

Redeploy after any env change.

## Supabase Auth URLs

**Authentication → URL Configuration**

- **Site URL:** `https://dev-pulse-delta-ten.vercel.app`
- **Redirect URLs:**
  - `https://dev-pulse-delta-ten.vercel.app/auth/callback`
  - `https://*.vercel.app/auth/callback` (preview)

**Providers → GitHub:** enabled, with **Save provider token** (or equivalent) so OAuth returns `provider_token`.
