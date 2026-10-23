/**
 * Sync .env.local → Vercel Production (+ Preview) for dev-pulse.
 * Requires: vercel CLI logged in with access to team kostursubbm-9159s-projects
 *
 * Usage: node scripts/sync-vercel-env.mjs
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')
const PROJECT = 'dev-pulse'
const SCOPE = 'kostursubbm-9159s-projects'
const PRODUCTION_SITE_URL = 'https://dev-pulse-delta-ten.vercel.app'

const PUBLIC_KEYS = new Set([
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'OPENAI_INSIGHTS_MODEL',
])

function parseEnvFile(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

const raw = readFileSync(envPath, 'utf8')
const env = parseEnvFile(raw)
env.NEXT_PUBLIC_SITE_URL = PRODUCTION_SITE_URL

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_TOKEN_ENCRYPTION_KEY',
]

for (const key of required) {
  if (!env[key]) {
    console.error(`Missing ${key} in .env.local`)
    process.exit(1)
  }
}

function vercelEnvAdd(key, value, target) {
  const args = [
    'env',
    'add',
    key,
    target,
    '--force',
    '--scope',
    SCOPE,
    '--project',
    PROJECT,
  ]
  const result = spawnSync('npx.cmd', ['vercel', ...args], {
    input: value,
    encoding: 'utf8',
    cwd: root,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  if (result.status !== 0) {
    console.error(`Failed to set ${key} for ${target}`)
    process.exit(result.status ?? 1)
  }
  console.log(`Set ${key} (${target})`)
}

for (const [key, value] of Object.entries(env)) {
  if (key.startsWith('#') || !value) continue
  for (const target of ['production', 'preview']) {
    vercelEnvAdd(key, value, target)
  }
}

console.log('Done. Redeploy dev-pulse on Vercel (Production).')
