import { config } from 'dotenv'
import pg from 'pg'

config({ path: '.env.local' })

const { Pool } = pg

function hostFromUrl(url) {
  const at = url.lastIndexOf('@')
  if (at < 0) return '(no @)'
  const rest = url.slice(at + 1)
  const slash = rest.indexOf('/')
  const hostPort = slash >= 0 ? rest.slice(0, slash) : rest.split('?')[0]
  const colon = hostPort.lastIndexOf(':')
  return colon >= 0 ? hostPort.slice(0, colon) : hostPort
}

async function test(name, url) {
  if (!url) {
    console.log(`${name}: MISSING`)
    return
  }
  console.log(`${name}: host=${hostFromUrl(url)}`)
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 20000,
    ssl: { rejectUnauthorized: false },
  })
  try {
    await pool.query('select 1 as ok')
    console.log(`${name}: OK`)
  } catch (e) {
    console.log(`${name}: FAIL ${e.code ?? ''} ${String(e.message).slice(0, 200)}`)
  } finally {
    await pool.end()
  }
}

await test('DIRECT_URL', process.env.DIRECT_URL)
await test('DATABASE_URL', process.env.DATABASE_URL)
