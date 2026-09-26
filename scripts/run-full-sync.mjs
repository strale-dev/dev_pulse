import Module from 'node:module'
import { config } from 'dotenv'

config({ path: '.env.local' })

const originalRequire = Module.prototype.require
Module.prototype.require = function (id) {
  if (id === 'server-only') {
    return {}
  }
  return originalRequire.apply(this, arguments)
}

const userId =
  process.argv[2] ?? process.env.DEVPULSE_SYNC_USER_ID ?? '402f57c3-a73e-4ca2-a84a-a71a458d18c7'

const { runSyncPipeline } = await import('../lib/github/sync/run-sync.ts')

console.log(`Starting full sync for user ${userId}…`)
const { syncRunId } = await runSyncPipeline({ userId, kind: 'full' })
console.log(`Done. sync_run id: ${syncRunId}`)
