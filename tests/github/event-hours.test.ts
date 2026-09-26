import { describe, expect, it } from 'vitest'

import { extractCommitHoursUtc } from '@/lib/github/mappers'
import type { GitHubPublicEvent } from '@/lib/github/types'

function event(partial: {
  type: string
  created_at?: string | null
  payload?: unknown
}): GitHubPublicEvent {
  return partial as GitHubPublicEvent
}

describe('extractCommitHoursUtc', () => {
  it('emits one UTC hour per commit in a PushEvent', () => {
    expect(
      extractCommitHoursUtc([
        event({
          type: 'PushEvent',
          created_at: '2026-01-05T14:15:00.000Z',
          payload: { size: 3 },
        }),
        event({
          type: 'PushEvent',
          created_at: '2026-01-05T09:00:00.000Z',
          payload: { commits: [{}, {}] },
        }),
        event({ type: 'PullRequestEvent', created_at: '2026-01-05T14:00:00.000Z' }),
      ]),
    ).toEqual([14, 14, 14, 9, 9])
  })

  it('falls back to one commit when payload has no size or commits', () => {
    expect(
      extractCommitHoursUtc([
        event({ type: 'PushEvent', created_at: '2026-01-05T01:00:00.000Z', payload: {} }),
        event({ type: 'PushEvent', created_at: '2026-01-05T02:00:00.000Z' }),
        event({ type: 'PushEvent', created_at: null }),
      ]),
    ).toEqual([1, 2])
  })
})
