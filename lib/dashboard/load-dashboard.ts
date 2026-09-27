import 'server-only'

import { and, asc, desc, eq, gt, or } from 'drizzle-orm'

import { computeMostActiveWeekday } from '@/lib/analytics/activity-timeseries'
import {
  groupContributionDaysIntoWeeks,
  sumContributions,
  type ContributionGridCell,
} from '@/lib/analytics/contribution-grid'
import { aggregateLanguageBreakdown } from '@/lib/analytics/language-mix'
import { unwrapMetric } from '@/lib/analytics/metric-result'
import type { AnalyticsSnapshotPayload } from '@/lib/analytics/schema'
import { computeStreaks } from '@/lib/analytics/streaks'
import {
  buildDevelopmentStats,
  type DashboardDevelopmentStats,
} from '@/lib/dashboard/build-development-stats'
import { computePeriodDeltas, type PeriodDeltas } from '@/lib/dashboard/compute-period-deltas'
import { db } from '@/lib/db'
import {
  activityEvents,
  analyticsSnapshots,
  contributionDays,
  profiles,
  repositories,
  repositoryLanguages,
} from '@/lib/db/schema'
import { getGitHubLanguageColor } from '@/lib/github/language-colors'

export type DashboardTopRepo = {
  id: string
  name: string
  description: string | null
  htmlUrl: string
  primaryLanguage: string | null
  stargazersCount: number
  forksCount: number
  commitsLast90d: number | null
}

export type DashboardRecentDay = {
  day: string
  commits: number
  pullRequests: number
  issues: number
}

export type DashboardOverview = {
  totalRepos: number
  totalCommits: number
  totalPrs: number
  totalIssues: number
  deltas: PeriodDeltas
}

export type DashboardHeatmapStats = {
  totalContributions: number
  currentStreak: number
  longestStreak: number
  mostActiveDay: string | null
}

export type DashboardLanguageSegment = {
  language: string
  percentage: number
  color: string
}

export type DashboardData = {
  overview: DashboardOverview
  topRepos: DashboardTopRepo[]
  recentActivity: DashboardRecentDay[]
  activityDays: DashboardRecentDay[]
  contributionWeeks: ContributionGridCell[][]
  heatmapStats: DashboardHeatmapStats
  languageSegments: DashboardLanguageSegment[]
  developmentStats: DashboardDevelopmentStats
}

export async function loadDashboard(userId: string): Promise<DashboardData> {
  const [
    snapshotRows,
    previousSnapshotRows,
    activityRows,
    topRepoRows,
    contributionRows,
    languageRows,
  ] = await Promise.all([
    db
      .select({
        totalCommits: analyticsSnapshots.totalCommits,
        totalPrs: analyticsSnapshots.totalPrs,
        totalIssues: analyticsSnapshots.totalIssues,
        totalRepos: analyticsSnapshots.totalRepos,
        payload: analyticsSnapshots.payload,
      })
      .from(analyticsSnapshots)
      .where(eq(analyticsSnapshots.userId, userId))
      .orderBy(desc(analyticsSnapshots.createdAt))
      .limit(1),
    db
      .select({ totalRepos: analyticsSnapshots.totalRepos })
      .from(analyticsSnapshots)
      .where(eq(analyticsSnapshots.userId, userId))
      .orderBy(desc(analyticsSnapshots.createdAt))
      .limit(2),
    db
      .select({
        day: activityEvents.day,
        commits: activityEvents.commits,
        pullRequests: activityEvents.pullRequests,
        issues: activityEvents.issues,
      })
      .from(activityEvents)
      .where(eq(activityEvents.userId, userId)),
    db
      .select({
        id: repositories.id,
        name: repositories.name,
        description: repositories.description,
        htmlUrl: repositories.htmlUrl,
        primaryLanguage: repositories.primaryLanguage,
        stargazersCount: repositories.stargazersCount,
        forksCount: repositories.forksCount,
      })
      .from(repositories)
      .where(eq(repositories.userId, userId))
      .orderBy(desc(repositories.stargazersCount))
      .limit(6),
    db
      .select({
        day: contributionDays.day,
        contributions: contributionDays.contributions,
        level: contributionDays.level,
      })
      .from(contributionDays)
      .where(eq(contributionDays.userId, userId))
      .orderBy(asc(contributionDays.day)),
    db
      .select({
        language: repositoryLanguages.language,
        bytes: repositoryLanguages.bytes,
      })
      .from(repositoryLanguages)
      .where(eq(repositoryLanguages.userId, userId)),
  ])

  const snapshot = snapshotRows[0]
  const payload = snapshot?.payload as AnalyticsSnapshotPayload | undefined
  const commitsByName = new Map(
    payload?.topRepositories.map((repo) => [repo.name, repo.commitsLast90d]) ?? [],
  )

  const activityDayRows = activityRows.map((row) => ({
    day: String(row.day),
    commits: row.commits,
    pullRequests: row.pullRequests,
    issues: row.issues,
  }))

  const previousTotalRepos =
    previousSnapshotRows.length > 1 ? previousSnapshotRows[1]!.totalRepos : null

  const overview: DashboardOverview = {
    totalRepos: snapshot?.totalRepos ?? 0,
    totalCommits: snapshot?.totalCommits ?? 0,
    totalPrs: snapshot?.totalPrs ?? 0,
    totalIssues: snapshot?.totalIssues ?? 0,
    deltas: computePeriodDeltas(
      activityDayRows,
      snapshot?.totalRepos ?? 0,
      previousTotalRepos,
    ),
  }

  const topRepos: DashboardTopRepo[] = topRepoRows.map((repo) => ({
    id: repo.id.toString(),
    name: repo.name,
    description: repo.description,
    htmlUrl: repo.htmlUrl,
    primaryLanguage: repo.primaryLanguage,
    stargazersCount: repo.stargazersCount,
    forksCount: repo.forksCount,
    commitsLast90d: commitsByName.get(repo.name) ?? null,
  }))

  const recentActivityRows = await db
    .select({
      day: activityEvents.day,
      commits: activityEvents.commits,
      pullRequests: activityEvents.pullRequests,
      issues: activityEvents.issues,
    })
    .from(activityEvents)
    .where(
      and(
        eq(activityEvents.userId, userId),
        or(
          gt(activityEvents.commits, 0),
          gt(activityEvents.pullRequests, 0),
          gt(activityEvents.issues, 0),
        ),
      ),
    )
    .orderBy(desc(activityEvents.day))
    .limit(14)

  const recentActivity: DashboardRecentDay[] = recentActivityRows.map((row) => ({
    day: String(row.day),
    commits: row.commits,
    pullRequests: row.pullRequests,
    issues: row.issues,
  }))

  const activityDays: DashboardRecentDay[] = activityDayRows

  const contributionGridCells: ContributionGridCell[] = contributionRows.map((row) => ({
    day: String(row.day),
    contributions: row.contributions,
    level: row.level,
  }))

  const { currentStreak, longestStreak } = computeStreaks(
    contributionGridCells.map((day) => ({
      day: day.day,
      contributions: day.contributions,
    })),
  )

  const heatmapStats: DashboardHeatmapStats = {
    totalContributions: sumContributions(contributionGridCells),
    currentStreak,
    longestStreak,
    mostActiveDay: unwrapMetric(computeMostActiveWeekday(activityDayRows)),
  }

  const languageSegments: DashboardLanguageSegment[] = aggregateLanguageBreakdown(
    languageRows.map((row) => ({
      language: row.language,
      bytes: row.bytes,
    })),
  ).map((segment) => ({
    ...segment,
    color: getGitHubLanguageColor(segment.language),
  }))

  const repoCommitsLast90d =
    payload?.repoCommitsLast90d?.map((row) => ({
      id: BigInt(row.id),
      name: row.name,
      commits: row.commits,
    })) ?? []

  const developmentStats = buildDevelopmentStats({
    activityRows: activityDayRows,
    contributionDays: contributionGridCells.map((day) => ({
      day: day.day,
      contributions: day.contributions,
    })),
    languageRows: languageRows.map((row) => ({
      language: row.language,
      bytes: row.bytes,
    })),
    repoCommitsLast90d,
    mostActiveHourUtc: payload?.mostActiveHourUTC ?? null,
    totals: snapshot
      ? {
          totalCommits: snapshot.totalCommits,
          totalPrs: snapshot.totalPrs,
          totalIssues: snapshot.totalIssues,
        }
      : undefined,
  })

  return {
    overview,
    topRepos,
    recentActivity,
    activityDays,
    contributionWeeks: groupContributionDaysIntoWeeks(contributionGridCells),
    heatmapStats,
    languageSegments,
    developmentStats,
  }
}

export type ShellUser = {
  displayName: string
  githubLogin: string | null
  avatarUrl: string | null
  email: string | null
}

export async function loadShellUser(userId: string, email: string | null): Promise<ShellUser> {
  const rows = await db
    .select({
      displayName: profiles.displayName,
      githubLogin: profiles.githubLogin,
      avatarUrl: profiles.avatarUrl,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)

  const profile = rows[0]
  const displayName =
    profile?.displayName ?? profile?.githubLogin ?? email ?? 'Developer'

  return {
    displayName,
    githubLogin: profile?.githubLogin ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    email,
  }
}
