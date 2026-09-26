import { describe, expect, it } from 'vitest'

import {
  aggregateLanguagePercentages,
  buildAnalyticsSnapshotPayload,
  computeActivityTrend,
  computeMostActiveWeekday,
  hashAnalyticsPayload,
  windowStartDateFromToday,
} from '@/lib/analytics/snapshot-pure'

describe('aggregateLanguagePercentages', () => {
  it('sums bytes and returns rounded percentages', () => {
    const mix = aggregateLanguagePercentages([
      { language: 'TypeScript', bytes: BigInt(750) },
      { language: 'TypeScript', bytes: BigInt(250) },
      { language: 'CSS', bytes: BigInt(250) },
    ])
    expect(mix[0]).toEqual({ language: 'TypeScript', percentage: 80 })
    expect(mix[1]).toEqual({ language: 'CSS', percentage: 20 })
  })
})

describe('computeMostActiveWeekday', () => {
  it('picks weekday with the highest median daily commits', () => {
    const day = computeMostActiveWeekday([
      { day: '2026-01-05', commits: 10, pullRequests: 0, issues: 0 },
      { day: '2026-01-06', commits: 2, pullRequests: 0, issues: 0 },
    ])
    expect(day).toEqual({ status: 'ok', value: 'Monday' })
  })
})

describe('computeActivityTrend', () => {
  it('detects up, down, and flat trends', () => {
    const rows = [
      { day: '2025-06-01', commits: 1, pullRequests: 0, issues: 0 },
      { day: '2025-07-01', commits: 5, pullRequests: 0, issues: 0 },
      { day: '2025-12-01', commits: 10, pullRequests: 0, issues: 0 },
    ]
    expect(computeActivityTrend(rows, '2025-11-01', '2025-05-01')).toBe('up')
    expect(computeActivityTrend(rows, '2025-12-15', '2025-06-15')).toBe('down')
    expect(computeActivityTrend([], '2025-11-01', '2025-05-01')).toBe('flat')
  })
})

describe('buildAnalyticsSnapshotPayload', () => {
  it('builds a coherent payload and stable hash', () => {
    const payload = buildAnalyticsSnapshotPayload({
      activityRows: [
        { day: '2026-01-05', commits: 4, pullRequests: 1, issues: 0 },
      ],
      contributionDays: [{ day: '2026-01-05', contributions: 4 }],
      repoRows: [{ id: BigInt(1), name: 'demo', stargazersCount: 3 }],
      languageRows: [{ language: 'TypeScript', bytes: BigInt(100) }],
      windowDays: 365,
      window90Start: '2025-10-01',
      window180Start: '2025-07-01',
    })

    expect(payload.totalCommits).toBe(4)
    expect(payload.totalPRs).toBe(1)
    expect(payload.totalRepos).toBe(1)
    expect(payload.topLanguages[0]?.language).toBe('TypeScript')
    expect(payload.insufficientData).toBe(true)
    expect(payload.mostActiveDay).toBeNull()
    expect(payload.avgCommitsPerActiveDay).toBeNull()
    expect(payload.topRepositories[0]?.commitsLast90d).toBeNull()
    expect(hashAnalyticsPayload(payload)).toMatch(/^[a-f0-9]{64}$/)
  })

  it('fills hour, repo-90d, and averages when the account has enough commits', () => {
    const payload = buildAnalyticsSnapshotPayload({
      activityRows: [
        { day: '2026-01-05', commits: 8, pullRequests: 1, issues: 0 },
        { day: '2026-01-06', commits: 6, pullRequests: 0, issues: 1 },
      ],
      contributionDays: [
        { day: '2026-01-05', contributions: 8 },
        { day: '2026-01-06', contributions: 6 },
      ],
      repoRows: [
        { id: BigInt(1), name: 'stars-repo', stargazersCount: 40 },
        { id: BigInt(2), name: 'active-repo', stargazersCount: 1 },
      ],
      languageRows: [{ language: 'TypeScript', bytes: BigInt(100) }],
      windowDays: 365,
      window90Start: '2025-10-01',
      window180Start: '2025-07-01',
      commitHoursUtc: [14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 9],
      repoCommitsLast90d: [
        { id: BigInt(1), name: 'stars-repo', commits: 2 },
        { id: BigInt(2), name: 'active-repo', commits: 12 },
      ],
      now: new Date('2026-06-01T12:00:00.000Z'),
    })

    expect(payload.insufficientData).toBe(false)
    expect(payload.mostActiveDay).toBe('Monday')
    expect(payload.mostActiveHourUTC).toBe(14)
    expect(payload.avgCommitsPerActiveDay).toBe(7)
    expect(payload.topRepositories[0]).toEqual({
      name: 'stars-repo',
      commitsLast90d: 2,
      stars: 40,
    })
    expect(payload.totalIssues).toBe(1)
  })

  it('omits hour when extras are missing and treats an empty 90d list as known zeros', () => {
    const payload = buildAnalyticsSnapshotPayload({
      activityRows: [{ day: '2026-01-05', commits: 12, pullRequests: 0, issues: 0 }],
      contributionDays: [],
      repoRows: [{ id: BigInt(1), name: 'demo', stargazersCount: 0 }],
      languageRows: [],
      windowDays: 30,
      window90Start: '2025-12-01',
      window180Start: '2025-09-01',
      commitHoursUtc: [],
      repoCommitsLast90d: [],
    })

    expect(payload.mostActiveHourUTC).toBeNull()
    expect(payload.topRepositories[0]?.commitsLast90d).toBe(0)
  })
})

describe('windowStartDateFromToday', () => {
  it('subtracts whole UTC days from the supplied now', () => {
    expect(windowStartDateFromToday(90, new Date('2026-04-10T08:00:00.000Z'))).toBe(
      '2026-01-10',
    )
  })
})
