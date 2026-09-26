import { beforeEach, describe, expect, it, vi } from 'vitest'

const selectResults: unknown[][] = []

function createSelectChain(result: unknown) {
  const chain: {
    from: ReturnType<typeof vi.fn>
    where: ReturnType<typeof vi.fn>
  } = {
    from: vi.fn(),
    where: vi.fn(),
  }
  chain.from.mockReturnValue(chain)
  chain.where.mockResolvedValue(result)
  return chain
}

const insertReturning = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => {
      const next = selectResults.shift() ?? []
      return createSelectChain(next)
    }),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: insertReturning,
      })),
    })),
  },
}))

import { buildAnalyticsSnapshot, persistAnalyticsSnapshot } from '@/lib/analytics/snapshot'

describe('buildAnalyticsSnapshot', () => {
  beforeEach(() => {
    selectResults.length = 0
    insertReturning.mockReset()
  })

  it('builds from DB rows and uses 90d extras for topRepositoryId', async () => {
    selectResults.push(
      [
        {
          day: '2026-01-05',
          commits: 12,
          pullRequests: 1,
          issues: 0,
        },
      ],
      [{ day: '2026-01-05', contributions: 12 }],
      [
        { id: BigInt(1), name: 'stars', stargazersCount: 9 },
        { id: BigInt(2), name: 'active', stargazersCount: 1 },
      ],
      [{ language: 'TypeScript', bytes: BigInt(50) }],
    )

    const snapshot = await buildAnalyticsSnapshot({
      userId: '00000000-0000-0000-0000-000000000001',
      commitHoursUtc: [11, 11, 11, 11, 11, 11, 11, 11, 11, 11],
      repoCommitsLast90d: [
        { id: BigInt(1), name: 'stars', commits: 1 },
        { id: BigInt(2), name: 'active', commits: 11 },
      ],
    })

    expect(snapshot.totalCommits).toBe(12)
    expect(snapshot.payload.insufficientData).toBe(false)
    expect(snapshot.mostActiveHourUtc).toBe(11)
    expect(snapshot.topLanguage).toBe('TypeScript')
    expect(snapshot.topRepositoryId).toBe(BigInt(2))
    expect(snapshot.snapshotHash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('leaves hour and top repo omitted when extras are not passed', async () => {
    selectResults.push([], [], [], [])

    const snapshot = await buildAnalyticsSnapshot({
      userId: '00000000-0000-0000-0000-000000000001',
      windowDays: 90,
    })

    expect(snapshot.payload.insufficientData).toBe(true)
    expect(snapshot.mostActiveHourUtc).toBeNull()
    expect(snapshot.topRepositoryId).toBeNull()
    expect(snapshot.topLanguage).toBeNull()
    expect(snapshot.activityTrend).toBe('flat')
  })

  it('resolves most-active repo by name when ids do not match stored rows', async () => {
    selectResults.push(
      [{ day: '2026-01-05', commits: 12, pullRequests: 0, issues: 0 }],
      [],
      [{ id: BigInt(7), name: 'renamed', stargazersCount: 0 }],
      [],
    )

    const snapshot = await buildAnalyticsSnapshot({
      userId: 'user',
      repoCommitsLast90d: [{ id: BigInt(99), name: 'renamed', commits: 12 }],
    })

    expect(snapshot.topRepositoryId).toBe(BigInt(7))
  })

  it('keeps the GraphQL repo id when no stored repo matches', async () => {
    selectResults.push(
      [{ day: '2026-01-05', commits: 12, pullRequests: 0, issues: 0 }],
      [],
      [],
      [],
    )

    const snapshot = await buildAnalyticsSnapshot({
      userId: 'user',
      repoCommitsLast90d: [{ id: BigInt(42), name: 'ghost', commits: 12 }],
    })

    expect(snapshot.topRepositoryId).toBe(BigInt(42))
  })
})

describe('persistAnalyticsSnapshot', () => {
  beforeEach(() => {
    insertReturning.mockReset()
  })

  it('inserts the snapshot and returns the id', async () => {
    insertReturning.mockResolvedValue([{ id: 'snap-1' }])
    const snapshot = {
      payload: {
        totalCommits: 0,
        totalPRs: 0,
        totalIssues: 0,
        totalRepos: 0,
        topLanguages: [],
        mostActiveDay: null,
        mostActiveHourUTC: null,
        longestStreak: 0,
        currentStreak: 0,
        topRepositories: [],
        activityTrend: 'flat' as const,
        windowDays: 365,
        avgCommitsPerActiveDay: null,
        insufficientData: true,
      },
      snapshotHash: 'abc',
      totalCommits: 0,
      totalPrs: 0,
      totalIssues: 0,
      totalRepos: 0,
      longestStreak: 0,
      currentStreak: 0,
      mostActiveDay: null,
      mostActiveHourUtc: null,
      topLanguage: null,
      topRepositoryId: null,
      activityTrend: 'flat' as const,
      windowDays: 365,
    }

    await expect(persistAnalyticsSnapshot('user', snapshot)).resolves.toBe('snap-1')
  })

  it('returns an empty string when insert returns no row', async () => {
    insertReturning.mockResolvedValue([])
    const snapshot = {
      payload: {
        totalCommits: 0,
        totalPRs: 0,
        totalIssues: 0,
        totalRepos: 0,
        topLanguages: [],
        mostActiveDay: null,
        mostActiveHourUTC: null,
        longestStreak: 0,
        currentStreak: 0,
        topRepositories: [],
        activityTrend: 'flat' as const,
        windowDays: 365,
        avgCommitsPerActiveDay: null,
        insufficientData: true,
      },
      snapshotHash: 'abc',
      totalCommits: 0,
      totalPrs: 0,
      totalIssues: 0,
      totalRepos: 0,
      longestStreak: 0,
      currentStreak: 0,
      mostActiveDay: null,
      mostActiveHourUtc: null,
      topLanguage: null,
      topRepositoryId: null,
      activityTrend: 'flat' as const,
      windowDays: 365,
    }

    await expect(persistAnalyticsSnapshot('user', snapshot)).resolves.toBe('')
  })
})
