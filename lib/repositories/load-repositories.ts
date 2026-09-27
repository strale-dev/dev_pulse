import 'server-only'

import { desc, eq } from 'drizzle-orm'

import type { AnalyticsSnapshotPayload } from '@/lib/analytics/schema'
import { getGitHubLanguageColor } from '@/lib/github/language-colors'
import { db } from '@/lib/db'
import { analyticsSnapshots, repositories, repositoryLanguages } from '@/lib/db/schema'
import type {
  RepositoryLanguageSegment,
  RepositoryListItem,
} from '@/lib/repositories/types'

export type { RepositoryLanguageSegment, RepositoryListItem } from '@/lib/repositories/types'

function buildLanguageSegments(
  rows: Array<{ language: string; bytes: bigint }>,
): RepositoryLanguageSegment[] {
  if (rows.length === 0) {
    return []
  }

  const totalBytes = rows.reduce((sum, row) => sum + row.bytes, BigInt(0))
  if (totalBytes === BigInt(0)) {
    return []
  }

  return rows
    .map((row) => ({
      language: row.language,
      percentage: Math.round((Number(row.bytes) / Number(totalBytes)) * 1000) / 10,
      color: getGitHubLanguageColor(row.language),
    }))
    .sort((a, b) => b.percentage - a.percentage)
}

function commitsByRepoIdFromPayload(
  payload: AnalyticsSnapshotPayload | undefined,
): Map<string, number> {
  const map = new Map<string, number>()
  if (!payload?.repoCommitsLast90d) {
    return map
  }
  for (const row of payload.repoCommitsLast90d) {
    map.set(row.id, row.commits)
  }
  return map
}

export async function loadRepositories(userId: string): Promise<RepositoryListItem[]> {
  const [repoRows, languageRows, snapshotRows] = await Promise.all([
    db
      .select({
        id: repositories.id,
        name: repositories.name,
        fullName: repositories.fullName,
        description: repositories.description,
        htmlUrl: repositories.htmlUrl,
        stargazersCount: repositories.stargazersCount,
        forksCount: repositories.forksCount,
        pushedAt: repositories.pushedAt,
        githubUpdatedAt: repositories.githubUpdatedAt,
      })
      .from(repositories)
      .where(eq(repositories.userId, userId))
      .orderBy(desc(repositories.stargazersCount)),
    db
      .select({
        repositoryId: repositoryLanguages.repositoryId,
        language: repositoryLanguages.language,
        bytes: repositoryLanguages.bytes,
      })
      .from(repositoryLanguages)
      .where(eq(repositoryLanguages.userId, userId)),
    db
      .select({ payload: analyticsSnapshots.payload })
      .from(analyticsSnapshots)
      .where(eq(analyticsSnapshots.userId, userId))
      .orderBy(desc(analyticsSnapshots.createdAt))
      .limit(1),
  ])

  const payload = snapshotRows[0]?.payload as AnalyticsSnapshotPayload | undefined
  const commitsByRepoId = commitsByRepoIdFromPayload(payload)
  const hasCommitCountsInSnapshot = payload?.repoCommitsLast90d !== undefined

  const languagesByRepoId = new Map<string, Array<{ language: string; bytes: bigint }>>()
  for (const row of languageRows) {
    const repoId = row.repositoryId.toString()
    const list = languagesByRepoId.get(repoId) ?? []
    list.push({ language: row.language, bytes: row.bytes })
    languagesByRepoId.set(repoId, list)
  }

  return repoRows.map((repo) => {
    const id = repo.id.toString()
    return {
      id,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description,
      htmlUrl: repo.htmlUrl,
      stargazersCount: repo.stargazersCount,
      forksCount: repo.forksCount,
      pushedAt: repo.pushedAt ? repo.pushedAt.toISOString() : null,
      githubUpdatedAt: repo.githubUpdatedAt ? repo.githubUpdatedAt.toISOString() : null,
      commitsLast90d: hasCommitCountsInSnapshot ? (commitsByRepoId.get(id) ?? 0) : null,
      languages: buildLanguageSegments(languagesByRepoId.get(id) ?? []),
    }
  })
}
