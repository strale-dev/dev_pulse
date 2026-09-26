import { describe, expect, it } from 'vitest'

import { canonicalizeJson, hashAnalyticsPayload } from '@/lib/analytics/hash'
import type { AnalyticsSnapshotPayload } from '@/lib/analytics/schema'

const basePayload: AnalyticsSnapshotPayload = {
  totalCommits: 12,
  totalPRs: 1,
  totalIssues: 0,
  totalRepos: 2,
  topLanguages: [{ language: 'TypeScript', percentage: 100 }],
  mostActiveDay: 'Monday',
  mostActiveHourUTC: 14,
  longestStreak: 3,
  currentStreak: 1,
  topRepositories: [{ name: 'demo', commitsLast90d: 12, stars: 4 }],
  activityTrend: 'up',
  windowDays: 365,
  avgCommitsPerActiveDay: 6,
  insufficientData: false,
}

describe('hashAnalyticsPayload', () => {
  it('is stable for identical payloads and key-order permutations', () => {
    const first = hashAnalyticsPayload(basePayload)
    const second = hashAnalyticsPayload({ ...basePayload })
    const reordered = {
      windowDays: basePayload.windowDays,
      insufficientData: basePayload.insufficientData,
      avgCommitsPerActiveDay: basePayload.avgCommitsPerActiveDay,
      activityTrend: basePayload.activityTrend,
      topRepositories: basePayload.topRepositories,
      currentStreak: basePayload.currentStreak,
      longestStreak: basePayload.longestStreak,
      mostActiveHourUTC: basePayload.mostActiveHourUTC,
      mostActiveDay: basePayload.mostActiveDay,
      topLanguages: basePayload.topLanguages,
      totalRepos: basePayload.totalRepos,
      totalIssues: basePayload.totalIssues,
      totalPRs: basePayload.totalPRs,
      totalCommits: basePayload.totalCommits,
    } as AnalyticsSnapshotPayload

    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(first).toBe(second)
    expect(first).toBe(hashAnalyticsPayload(reordered))
  })

  it('changes when any semantic field changes', () => {
    const original = hashAnalyticsPayload(basePayload)
    expect(hashAnalyticsPayload({ ...basePayload, totalCommits: 13 })).not.toBe(original)
    expect(hashAnalyticsPayload({ ...basePayload, mostActiveDay: 'Tuesday' })).not.toBe(
      original,
    )
  })

  it('rejects payloads that do not match the Zod snapshot schema', () => {
    expect(() =>
      hashAnalyticsPayload({
        ...basePayload,
        activityTrend: 'sideways',
      } as unknown as AnalyticsSnapshotPayload),
    ).toThrow()
  })

  it('canonicalizes nested objects and bigint leaves', () => {
    expect(canonicalizeJson({ b: 1, a: { d: 2, c: 3 } })).toEqual({
      a: { c: 3, d: 2 },
      b: 1,
    })
    expect(canonicalizeJson([BigInt(2), { z: 1, a: 0 }])).toEqual(['2', { a: 0, z: 1 }])
    expect(canonicalizeJson(null)).toBeNull()
  })
})
