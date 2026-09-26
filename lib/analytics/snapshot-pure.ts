/**
 * Phase 5 — Analytics engine (starting point).
 * Pure snapshot builders (no DB). Phase 4 sync calls the async wrapper in snapshot.ts;
 * Phase 5 will harden definitions, top-repo commits, hour-of-day, and tests here.
 */

import { createHash } from 'node:crypto'

import { computeStreaks, type ContributionDayLike } from '@/lib/analytics/streaks'

export type AnalyticsSnapshotPayload = {
  totalCommits: number
  totalPRs: number
  totalIssues: number
  totalRepos: number
  topLanguages: Array<{ language: string; percentage: number }>
  mostActiveDay: string | null
  mostActiveHourUTC: number | null
  longestStreak: number
  currentStreak: number
  topRepositories: Array<{ name: string; commitsLast90d: number; stars: number }>
  activityTrend: 'up' | 'down' | 'flat'
  windowDays: number
}

export type ActivityDayRow = {
  day: string
  commits: number
  pullRequests: number
  issues: number
}

export type RepoSummaryRow = {
  id: bigint
  name: string
  stargazersCount: number
}

export type LanguageByteRow = {
  language: string
  bytes: bigint
}

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export function hashAnalyticsPayload(payload: AnalyticsSnapshotPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export function aggregateLanguagePercentages(
  rows: LanguageByteRow[],
  limit = 5,
): Array<{ language: string; percentage: number }> {
  const bytesByLanguage = new Map<string, bigint>()
  for (const row of rows) {
    const prev = bytesByLanguage.get(row.language) ?? BigInt(0)
    bytesByLanguage.set(row.language, prev + row.bytes)
  }
  const totalBytes = [...bytesByLanguage.values()].reduce(
    (a, b) => a + b,
    BigInt(0),
  )
  return [...bytesByLanguage.entries()]
    .map(([language, bytes]) => ({
      language,
      percentage:
        totalBytes > BigInt(0)
          ? Math.round((Number(bytes) / Number(totalBytes)) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit)
}

export function computeMostActiveWeekday(activityRows: ActivityDayRow[]): string | null {
  const weekdayTotals = new Map<number, number>()
  for (const row of activityRows) {
    const weekday = new Date(`${row.day}T12:00:00.000Z`).getUTCDay()
    weekdayTotals.set(weekday, (weekdayTotals.get(weekday) ?? 0) + row.commits)
  }
  let mostActiveDay: string | null = null
  let bestWeekdayCount = 0
  for (const [weekday, count] of weekdayTotals.entries()) {
    if (count > bestWeekdayCount) {
      bestWeekdayCount = count
      mostActiveDay = WEEKDAY_LABELS[weekday] ?? null
    }
  }
  return mostActiveDay
}

export function computeActivityTrend(
  activityRows: ActivityDayRow[],
  window90Start: string,
  window180Start: string,
): 'up' | 'down' | 'flat' {
  const recent90 = activityRows.filter((r) => r.day >= window90Start)
  const prev90 = activityRows.filter(
    (r) => r.day >= window180Start && r.day < window90Start,
  )
  const recentSum = recent90.reduce((s, r) => s + r.commits, 0)
  const prevSum = prev90.reduce((s, r) => s + r.commits, 0)
  if (recentSum > prevSum) return 'up'
  if (recentSum < prevSum) return 'down'
  return 'flat'
}

export function buildTopRepositoriesByStars(
  repoRows: RepoSummaryRow[],
  limit = 5,
): Array<{ name: string; commitsLast90d: number; stars: number; id: bigint }> {
  return repoRows
    .map((repo) => ({
      name: repo.name,
      commitsLast90d: 0,
      stars: repo.stargazersCount,
      id: repo.id,
    }))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, limit)
}

export function buildAnalyticsSnapshotPayload(input: {
  activityRows: ActivityDayRow[]
  contributionDays: ContributionDayLike[]
  repoRows: RepoSummaryRow[]
  languageRows: LanguageByteRow[]
  windowDays: number
  window90Start: string
  window180Start: string
}): AnalyticsSnapshotPayload {
  const totalCommits = input.activityRows.reduce((sum, row) => sum + row.commits, 0)
  const totalPrs = input.activityRows.reduce((sum, row) => sum + row.pullRequests, 0)
  const totalIssues = input.activityRows.reduce((sum, row) => sum + row.issues, 0)
  const totalRepos = input.repoRows.length

  const topLanguages = aggregateLanguagePercentages(input.languageRows)
  const mostActiveDay = computeMostActiveWeekday(input.activityRows)
  const { currentStreak, longestStreak } = computeStreaks(input.contributionDays)
  const topRepoRows = buildTopRepositoriesByStars(input.repoRows)
  const activityTrend = computeActivityTrend(
    input.activityRows,
    input.window90Start,
    input.window180Start,
  )

  return {
    totalCommits,
    totalPRs: totalPrs,
    totalIssues,
    totalRepos,
    topLanguages,
    mostActiveDay,
    mostActiveHourUTC: null,
    longestStreak,
    currentStreak,
    topRepositories: topRepoRows.map(({ name, commitsLast90d, stars }) => ({
      name,
      commitsLast90d,
      stars,
    })),
    activityTrend,
    windowDays: input.windowDays,
  }
}

export function windowStartDateFromToday(windowDays: number, today = new Date()): string {
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() - windowDays)
  return d.toISOString().slice(0, 10)
}
