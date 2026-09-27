import { describe, expect, it } from 'vitest'

import { buildDevelopmentStats } from '@/lib/dashboard/build-development-stats'

describe('buildDevelopmentStats', () => {
  it('omits most active repo and weekday when data is insufficient', () => {
    const stats = buildDevelopmentStats({
      activityRows: [{ day: '2026-01-01', commits: 2, pullRequests: 0, issues: 0 }],
      contributionDays: [],
      languageRows: [],
      repoCommitsLast90d: [{ id: BigInt(1), name: 'demo', commits: 2 }],
    })

    expect(stats.totalCommits).toBe(2)
    expect(stats.mostActiveRepoName).toBeNull()
    expect(stats.mostActiveDay).toBeNull()
    expect(stats.avgCommitsPerActiveDay).toBeNull()
  })

  it('uses snapshot totals and hour when provided', () => {
    const stats = buildDevelopmentStats({
      activityRows: [],
      contributionDays: [{ day: '2026-01-01', contributions: 3 }],
      languageRows: [{ language: 'TypeScript', bytes: BigInt(100) }],
      repoCommitsLast90d: Array.from({ length: 10 }, (_, index) => ({
        id: BigInt(index + 1),
        name: `repo-${index}`,
        commits: index === 0 ? 10 : 1,
      })),
      mostActiveHourUtc: 14,
      totals: { totalCommits: 50, totalPrs: 4, totalIssues: 2 },
    })

    expect(stats.totalCommits).toBe(50)
    expect(stats.totalPrs).toBe(4)
    expect(stats.mostActiveHourUtc).toBe(14)
    expect(stats.mostActiveRepoName).toBe('repo-0')
    expect(stats.mostUsedLanguage).toBe('TypeScript')
  })
})
