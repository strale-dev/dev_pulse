import 'server-only'

import PQueue from 'p-queue'

const githubQueue = new PQueue({ concurrency: 4 })

export function runQueued<T>(fn: () => Promise<T>): Promise<T> {
  return githubQueue.add(fn)
}
