import { describe, expect, it, vi } from 'vitest'

import {
  buildAnalyticsSnapshotPayload,
  windowStartDateFromToday,
} from '@/lib/analytics/snapshot-pure'
import { mapActivityEvents } from '@/lib/github/mappers'

/**
 * Phase 4 checklist: GitHub account with zero public repos / empty API payloads.
 * Uses mocked shapes (no second OAuth account required).
 */

const noopChain = {
  where: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockReturnValue(undefined),
}

vi.mock('@/lib/db', () => ({
  db: {
    delete: vi.fn(() => noopChain),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    update: vi.fn(() => noopChain),
  },
}))

describe('empty GitHub account payloads', () => {
  it('maps zero calendar days and zero events without rows', () => {
    expect(mapActivityEvents('user-id', [], [])).toEqual([])
  })

  it('builds analytics snapshot with zeros and empty lists', () => {
    const payload = buildAnalyticsSnapshotPayload({
      activityRows: [],
      contributionDays: [],
      repoRows: [],
      languageRows: [],
      windowDays: 365,
      window90Start: windowStartDateFromToday(90),
      window180Start: windowStartDateFromToday(180),
    })

    expect(payload).toMatchObject({
      totalCommits: 0,
      totalPRs: 0,
      totalIssues: 0,
      totalRepos: 0,
      topLanguages: [],
      topRepositories: [],
      longestStreak: 0,
      currentStreak: 0,
      activityTrend: 'flat',
    })
  })
})

describe('persist + analytics_snapshot steps with empty data (mocked DB)', () => {
  it('persist helpers resolve when lists are empty', async () => {
    const { persistRepositories, persistRepositoryLanguages, persistContributionDays, persistActivityEvents } =
      await import('@/lib/github/persist')

    await expect(
      persistRepositories('00000000-0000-0000-0000-000000000001', []),
    ).resolves.toBeUndefined()
    await expect(
      persistRepositoryLanguages('00000000-0000-0000-0000-000000000001', []),
    ).resolves.toBeUndefined()
    await expect(persistContributionDays([])).resolves.toBeUndefined()
    await expect(persistActivityEvents([])).resolves.toBeUndefined()
  })
})
