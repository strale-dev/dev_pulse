import { readFileSync } from 'node:fs'

function parsePostgresUrl(raw) {
  const trimmed = raw.trim().replace(/^["']|["']$/g, '')
  const rest = trimmed.replace(/^postgres(?:ql)?:\/\//, '')
  const at = rest.lastIndexOf('@')
  const userInfo = rest.slice(0, at)
  const colon = userInfo.indexOf(':')
  const user = userInfo.slice(0, colon)
  let password = userInfo.slice(colon + 1)
  try {
    password = decodeURIComponent(password)
  } catch {
    /* keep */
  }
  return { user, passLen: password.length }
}

const lines = readFileSync('.env.local', 'utf8').split(/\r?\n/)
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  const line = lines.find((l) => l.startsWith(`${key}=`))
  const parsed = parsePostgresUrl(line.slice(key.length + 1))
  console.log(key, parsed)
}
