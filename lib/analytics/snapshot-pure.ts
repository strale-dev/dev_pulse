/**
 * Pure AnalyticsSnapshot builder. DB I/O lives in snapshot.ts.
 */

import { computeActivityTrend, computeAvgCommitsPerActiveDay, computeMostActiveHourUTC, computeMostActiveWeekday } from '@/lib/analytics/activity-timeseries'
import { hashAnalyticsPayload } from '@/lib/analytics/hash'
import { aggregateLanguagePercentages } from '@/lib/analytics/language-mix'
import { INSUFFICIENT_COMMITS_THRESHOLD, unwrapMetric } from '@/lib/analytics/metric-result'
import type { AnalyticsSnapshotPayload } from '@/lib/analytics/schema'
import { computeStreaks, type ContributionDayLike } from '@/lib/analytics/streaks'
import { buildTopRepositoriesByStars } from '@/lib/analytics/top-repo'
import type {
  ActivityDayRow,
  LanguageByteRow,
  RepoCommit90d,
  RepoSummaryRow,
} from '@/lib/analytics/types'

export type { AnalyticsSnapshotPayload } from '@/lib/analytics/schema'
export type {
  ActivityDayRow,
  LanguageByteRow,
  RepoCommit90d,
  RepoSummaryRow,
} from '@/lib/analytics/types'
export { hashAnalyticsPayload } from '@/lib/analytics/hash'
export { aggregateLanguagePercentages, computeMostUsedLanguage } from '@/lib/analytics/language-mix'
export {
  computeActivityTrend,
  computeAvgCommitsPerActiveDay,
  computeMostActiveHourUTC,
  computeMostActiveWeekday,
} from '@/lib/analytics/activity-timeseries'
export { buildTopRepositoriesByStars, computeMostActiveRepo } from '@/lib/analytics/top-repo'
export {
  INSUFFICIENT_COMMITS_THRESHOLD,
  unwrapMetric,
  type MetricResult,
} from '@/lib/analytics/metric-result'

export function buildAnalyticsSnapshotPayload(input: {
  activityRows: ActivityDayRow[]
  contributionDays: ContributionDayLike[]
  repoRows: RepoSummaryRow[]
  languageRows: LanguageByteRow[]
  windowDays: number
  window90Start: string
  window180Start: string
  commitHoursUtc?: number[]
  repoCommitsLast90d?: RepoCommit90d[]
  now?: Date
}): AnalyticsSnapshotPayload {
  const totalCommits = input.activityRows.reduce((sum, row) => sum + row.commits, 0)
  const totalPrs = input.activityRows.reduce((sum, row) => sum + row.pullRequests, 0)
  const totalIssues = input.activityRows.reduce((sum, row) => sum + row.issues, 0)
  const totalRepos = input.repoRows.length
  const insufficientData = totalCommits < INSUFFICIENT_COMMITS_THRESHOLD

  const topLanguages = aggregateLanguagePercentages(input.languageRows)
  const mostActiveDay = unwrapMetric(computeMostActiveWeekday(input.activityRows))
  const mostActiveHourUTC =
    input.commitHoursUtc === undefined
      ? null
      : unwrapMetric(computeMostActiveHourUTC(input.commitHoursUtc))
  const { currentStreak, longestStreak } = computeStreaks(input.contributionDays, input.now)
  const topRepoRows = buildTopRepositoriesByStars(input.repoRows, input.repoCommitsLast90d)
  const activityTrend = computeActivityTrend(
    input.activityRows,
    input.window90Start,
    input.window180Start,
  )
  const avgCommitsPerActiveDay = unwrapMetric(computeAvgCommitsPerActiveDay(input.activityRows))

  return {
    totalCommits,
    totalPRs: totalPrs,
    totalIssues,
    totalRepos,
    topLanguages,
    mostActiveDay,
    mostActiveHourUTC,
    longestStreak,
    currentStreak,
    topRepositories: topRepoRows.map(({ name, commitsLast90d, stars }) => ({
      name,
      commitsLast90d,
      stars,
    })),
    activityTrend,
    windowDays: input.windowDays,
    avgCommitsPerActiveDay,
    insufficientData,
  }
}

export function windowStartDateFromToday(windowDays: number, today = new Date()): string {
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() - windowDays)
  return d.toISOString().slice(0, 10)
}
