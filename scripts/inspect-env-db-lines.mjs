import { readFileSync } from 'node:fs'

const lines = readFileSync('.env.local', 'utf8').split(/\r?\n/)

for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  const line = lines.find((l) => l.startsWith(`${key}=`))
  if (!line) {
    console.log(`${key}: line missing`)
    continue
  }
  const val = line.slice(key.length + 1)
  console.log(key, {
    lineLen: line.length,
    valLen: val.length,
    quoted: val.startsWith('"') || val.startsWith("'"),
    questionMarks: (val.match(/\?/g) ?? []).length,
    atSigns: (val.match(/@/g) ?? []).length,
  })
}
