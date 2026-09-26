import { describe, expect, it } from 'vitest'

import {
  aggregateLanguagePercentages,
  buildAnalyticsSnapshotPayload,
  computeActivityTrend,
  computeMostActiveWeekday,
  hashAnalyticsPayload,
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
  it('picks weekday with highest commit totals', () => {
    const day = computeMostActiveWeekday([
      { day: '2026-01-05', commits: 10, pullRequests: 0, issues: 0 },
      { day: '2026-01-06', commits: 2, pullRequests: 0, issues: 0 },
    ])
    expect(day).toBe('Monday')
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
    expect(hashAnalyticsPayload(payload)).toMatch(/^[a-f0-9]{64}$/)
  })
})
