import 'server-only'

const CANDIDATE_KEYS = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
] as const

function normalizePostgresUrl(raw: string): string {
  return raw.trim().replace(/^postgres:/, 'postgresql:')
}

function isUsablePostgresUrl(raw: string): boolean {
  try {
    const url = new URL(normalizePostgresUrl(raw))
    if (!url.hostname || url.hostname === 'base') return false
    return url.protocol === 'postgresql:'
  } catch {
    return false
  }
}

/** Prefer DATABASE_URL; fall back to Supabase/Vercel integration postgres vars. */
export function resolveDatabaseUrl(): string {
  for (const key of CANDIDATE_KEYS) {
    const value = process.env[key]
    if (value && isUsablePostgresUrl(value)) return value.trim()
  }
  throw new Error(
    'Missing or invalid DATABASE_URL (check Vercel env: use Supabase transaction pooler :6543 with URL-encoded password)'
  )
}
