import 'server-only'

/**
 * Phase 5 — Analytics engine (starting point, not Phase 4 exit criteria).
 * Loads synced rows from Postgres and persists `analytics_snapshots`.
 * Pure rollup logic lives in snapshot-pure.ts (Vitest-covered); expand in Phase 5.
 */

import { and, eq, gte } from 'drizzle-orm'

import {
  buildAnalyticsSnapshotPayload,
  hashAnalyticsPayload,
  windowStartDateFromToday,
  type AnalyticsSnapshotPayload,
} from '@/lib/analytics/snapshot-pure'
import { db } from '@/lib/db'
import {
  activityEvents,
  analyticsSnapshots,
  contributionDays,
  repositories,
  repositoryLanguages,
} from '@/lib/db/schema'

export type { AnalyticsSnapshotPayload } from '@/lib/analytics/snapshot-pure'

export type BuiltAnalyticsSnapshot = {
  payload: AnalyticsSnapshotPayload
  snapshotHash: string
  totalCommits: number
  totalPrs: number
  totalIssues: number
  totalRepos: number
  longestStreak: number
  currentStreak: number
  mostActiveDay: string | null
  mostActiveHourUtc: number | null
  topLanguage: string | null
  topRepositoryId: bigint | null
  activityTrend: 'up' | 'down' | 'flat'
  windowDays: number
}

export async function buildAnalyticsSnapshot(input: {
  userId: string
  windowDays?: number
}): Promise<BuiltAnalyticsSnapshot> {
  const windowDays = input.windowDays ?? 365
  const windowStart = windowStartDateFromToday(windowDays)
  const window90Start = windowStartDateFromToday(90)
  const window180Start = windowStartDateFromToday(180)

  const [activityRows, contribRows, repoRows, languageRows] = await Promise.all([
    db
      .select()
      .from(activityEvents)
      .where(
        and(eq(activityEvents.userId, input.userId), gte(activityEvents.day, windowStart)),
      ),
    db
      .select()
      .from(contributionDays)
      .where(eq(contributionDays.userId, input.userId)),
    db.select().from(repositories).where(eq(repositories.userId, input.userId)),
    db
      .select()
      .from(repositoryLanguages)
      .where(eq(repositoryLanguages.userId, input.userId)),
  ])

  const payload = buildAnalyticsSnapshotPayload({
    activityRows: activityRows.map((row) => ({
      day: row.day,
      commits: row.commits,
      pullRequests: row.pullRequests,
      issues: row.issues,
    })),
    contributionDays: contribRows.map((row) => ({
      day: row.day,
      contributions: row.contributions,
    })),
    repoRows: repoRows.map((row) => ({
      id: row.id,
      name: row.name,
      stargazersCount: row.stargazersCount,
    })),
    languageRows: languageRows.map((row) => ({
      language: row.language,
      bytes: row.bytes,
    })),
    windowDays,
    window90Start,
    window180Start,
  })

  const topLanguage = payload.topLanguages[0]?.language ?? null
  const topRepositoryId = repoRows.find((r) => r.name === payload.topRepositories[0]?.name)?.id ?? null

  return {
    payload,
    snapshotHash: hashAnalyticsPayload(payload),
    totalCommits: payload.totalCommits,
    totalPrs: payload.totalPRs,
    totalIssues: payload.totalIssues,
    totalRepos: payload.totalRepos,
    longestStreak: payload.longestStreak,
    currentStreak: payload.currentStreak,
    mostActiveDay: payload.mostActiveDay,
    mostActiveHourUtc: payload.mostActiveHourUTC,
    topLanguage,
    topRepositoryId,
    activityTrend: payload.activityTrend,
    windowDays,
  }
}

export async function persistAnalyticsSnapshot(
  userId: string,
  snapshot: BuiltAnalyticsSnapshot,
): Promise<string> {
  const inserted = await db
    .insert(analyticsSnapshots)
    .values({
      userId,
      windowDays: snapshot.windowDays,
      snapshotHash: snapshot.snapshotHash,
      payload: snapshot.payload,
      totalCommits: snapshot.totalCommits,
      totalPrs: snapshot.totalPrs,
      totalIssues: snapshot.totalIssues,
      totalRepos: snapshot.totalRepos,
      longestStreak: snapshot.longestStreak,
      currentStreak: snapshot.currentStreak,
      mostActiveDay: snapshot.mostActiveDay,
      mostActiveHourUtc: snapshot.mostActiveHourUtc,
      topLanguage: snapshot.topLanguage,
      topRepositoryId: snapshot.topRepositoryId,
      activityTrend: snapshot.activityTrend,
    })
    .returning({ id: analyticsSnapshots.id })

  return inserted[0]?.id ?? ''
}
