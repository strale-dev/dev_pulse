/**
 * Normalize Supabase Postgres URLs in .env.local:
 * - URL-encode password (handles ? & @ in Supabase-generated passwords)
 * - Drop sslmode query (app uses Pool ssl config)
 * - Map DIRECT_URL db.* direct host → session pooler (IPv4) when DATABASE_URL uses Supavisor
 */
import { readFileSync, writeFileSync } from 'node:fs'

const ENV_PATH = '.env.local'

function parsePostgresUrl(raw) {
  const trimmed = raw.trim().replace(/^["']|["']$/g, '')
  const prefix = trimmed.match(/^postgres(?:ql)?:\/\//)
  if (!prefix) throw new Error('Expected postgres URL')

  const rest = trimmed.slice(prefix[0].length)
  const at = rest.lastIndexOf('@')
  if (at < 0) throw new Error('Missing @')

  const userInfo = rest.slice(0, at)
  let hostPart = rest.slice(at + 1)

  hostPart = hostPart.replace(/[?&]sslmode=[^&]*/g, '')
  hostPart = hostPart.replace(/\?&/, '?').replace(/[?&]$/, '')

  const colon = userInfo.indexOf(':')
  const user = userInfo.slice(0, colon)
  let password = userInfo.slice(colon + 1)
  try {
    password = decodeURIComponent(password)
  } catch {
    /* keep as-is */
  }

  return { user, password, hostPart, prefix: prefix[0] }
}

function buildPostgresUrl({ user, password, hostPart, prefix }) {
  return `${prefix}${user}:${encodeURIComponent(password)}@${hostPart}`
}

function projectRefFromDbHost(hostPart) {
  const host = hostPart.split('/')[0].split(':')[0]
  const m = host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)
  return m?.[1] ?? null
}

function poolerRegionFromTransactionUrl(databaseUrl) {
  const { hostPart } = parsePostgresUrl(databaseUrl)
  const host = hostPart.split('/')[0].split(':')[0]
  const m = host.match(/^(aws-\d+-[^.]+)\.pooler\.supabase\.com$/i)
  return m?.[1] ?? null
}

function toSessionPoolerDirectUrl(databaseUrl, directRaw) {
  const region = poolerRegionFromTransactionUrl(databaseUrl)
  const parsed = parsePostgresUrl(directRaw)
  const ref = projectRefFromDbHost(parsed.hostPart)
  if (!region || !ref) return buildPostgresUrl(parsed)

  return buildPostgresUrl({
    ...parsed,
    user: `postgres.${ref}`,
    hostPart: `${region}.pooler.supabase.com:5432/postgres`,
  })
}

const fileLines = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)
const dbLine = fileLines.find((l) => l.startsWith('DATABASE_URL='))
const directLine = fileLines.find((l) => l.startsWith('DIRECT_URL='))
if (!dbLine || !directLine) {
  console.error('DATABASE_URL and DIRECT_URL must exist in .env.local')
  process.exit(1)
}

const directParsed = parsePostgresUrl(directLine.slice('DIRECT_URL='.length))
const databaseUrl = buildPostgresUrl({
  ...parsePostgresUrl(dbLine.slice('DATABASE_URL='.length)),
  password: directParsed.password,
})
const directUrl = toSessionPoolerDirectUrl(databaseUrl, directLine.slice('DIRECT_URL='.length))

const out = fileLines.map((line) => {
  if (line.startsWith('DATABASE_URL=')) return `DATABASE_URL="${databaseUrl}"`
  if (line.startsWith('DIRECT_URL=')) return `DIRECT_URL="${directUrl}"`
  return line
})

writeFileSync(ENV_PATH, out.join('\n'), 'utf8')
console.log('Normalized DATABASE_URL and DIRECT_URL in .env.local')
