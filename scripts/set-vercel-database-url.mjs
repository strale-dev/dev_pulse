/**
 * Set DATABASE_URL + DIRECT_URL on Vercel from .env.local (password URL-encoded).
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PROJECT = 'dev-pulse'
const SCOPE = 'kostursubbm-9159s-projects'

function parseEnv(text) {
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[t.slice(0, i).trim()] = v
  }
  return out
}

function hostOf(url) {
  try {
    return new URL(url.replace(/^postgres:/, 'postgresql:')).hostname
  } catch {
    return '(invalid)'
  }
}

function setEnv(key, value, target) {
  const result = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vercel', 'env', 'add', key, target, '--force', '--scope', SCOPE, '--project', PROJECT],
    { input: value, cwd: root, stdio: ['pipe', 'inherit', 'inherit'] }
  )
  if (result.status !== 0) {
    console.error(`Failed: ${key} ${target}`)
    process.exit(result.status ?? 1)
  }
  console.log(`OK ${key} (${target}) host=${hostOf(value)}`)
}

const env = parseEnv(readFileSync(join(root, '.env.local'), 'utf8'))
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  const value = env[key]
  if (!value) {
    console.error(`Missing ${key} in .env.local`)
    process.exit(1)
  }
  for (const target of ['production', 'preview']) {
    setEnv(key, value, target)
  }
}

console.log('Redeploy production on Vercel if dashboard still errors.')
