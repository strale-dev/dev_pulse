import {
  computeAvgCommitsPerActiveDay,
  computeMostActiveWeekday,
} from '@/lib/analytics/activity-timeseries'
import { computeMostUsedLanguage } from '@/lib/analytics/language-mix'
import { unwrapMetric } from '@/lib/analytics/metric-result'
import { computeStreaks, type ContributionDayLike } from '@/lib/analytics/streaks'
import { computeMostActiveRepo } from '@/lib/analytics/top-repo'
import type { ActivityDayRow, LanguageByteRow, RepoCommit90d } from '@/lib/analytics/types'

export type DashboardDevelopmentStats = {
  totalCommits: number
  totalPrs: number
  totalIssues: number
  mostActiveRepoName: string | null
  mostUsedLanguage: string | null
  mostUsedLanguagePct: number | null
  mostActiveDay: string | null
  mostActiveHourUtc: number | null
  currentStreak: number
  longestStreak: number
  avgCommitsPerActiveDay: number | null
}

export function buildDevelopmentStats(input: {
  activityRows: ActivityDayRow[]
  contributionDays: ContributionDayLike[]
  languageRows: LanguageByteRow[]
  repoCommitsLast90d: RepoCommit90d[]
  /** From latest analytics snapshot (commit hours are not persisted separately). */
  mostActiveHourUtc?: number | null
  totals?: {
    totalCommits: number
    totalPrs: number
    totalIssues: number
  }
}): DashboardDevelopmentStats {
  const totalCommits =
    input.totals?.totalCommits ??
    input.activityRows.reduce((sum, row) => sum + row.commits, 0)
  const totalPrs =
    input.totals?.totalPrs ??
    input.activityRows.reduce((sum, row) => sum + row.pullRequests, 0)
  const totalIssues =
    input.totals?.totalIssues ??
    input.activityRows.reduce((sum, row) => sum + row.issues, 0)

  const mostActiveRepo = unwrapMetric(computeMostActiveRepo(input.repoCommitsLast90d))
  const mostUsed = unwrapMetric(computeMostUsedLanguage(input.languageRows))
  const { currentStreak, longestStreak } = computeStreaks(input.contributionDays)

  const mostActiveHourUtc = input.mostActiveHourUtc ?? null

  return {
    totalCommits,
    totalPrs,
    totalIssues,
    mostActiveRepoName: mostActiveRepo?.name ?? null,
    mostUsedLanguage: mostUsed?.language ?? null,
    mostUsedLanguagePct: mostUsed?.percentage ?? null,
    mostActiveDay: unwrapMetric(computeMostActiveWeekday(input.activityRows)),
    mostActiveHourUtc,
    currentStreak,
    longestStreak,
    avgCommitsPerActiveDay: unwrapMetric(computeAvgCommitsPerActiveDay(input.activityRows)),
  }
}
