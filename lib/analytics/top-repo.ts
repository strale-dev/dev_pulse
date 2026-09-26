import {
  INSUFFICIENT_COMMITS_THRESHOLD,
  metricInsufficient,
  metricOk,
  type MetricResult,
} from '@/lib/analytics/metric-result'
import type { RepoCommit90d, RepoSummaryRow, TopRepositoryRow } from '@/lib/analytics/types'

export function buildTopRepositoriesByStars(
  repoRows: RepoSummaryRow[],
  repoCommitsLast90d?: RepoCommit90d[],
  limit = 5,
): TopRepositoryRow[] {
  const has90d = repoCommitsLast90d !== undefined
  const commitsById = new Map(
    (repoCommitsLast90d ?? []).map((row) => [row.id.toString(), row.commits]),
  )
  const commitsByName = new Map(
    (repoCommitsLast90d ?? []).map((row) => [row.name, row.commits]),
  )

  return repoRows
    .map((repo) => ({
      name: repo.name,
      commitsLast90d: has90d
        ? (commitsById.get(repo.id.toString()) ?? commitsByName.get(repo.name) ?? 0)
        : null,
      stars: repo.stargazersCount,
      id: repo.id,
    }))
    .sort((a, b) => b.stars - a.stars)
    .slice(0, limit)
}

export function computeMostActiveRepo(
  rows: RepoCommit90d[],
): MetricResult<RepoCommit90d> {
  if (rows.length === 0) return metricInsufficient()
  const totalCommits = rows.reduce((sum, row) => sum + row.commits, 0)
  if (totalCommits < INSUFFICIENT_COMMITS_THRESHOLD) return metricInsufficient()

  let best: RepoCommit90d | undefined
  for (const row of rows) {
    if (!best || row.commits > best.commits) {
      best = row
    }
  }

  if (!best || best.commits <= 0) return metricInsufficient()
  return metricOk(best)
}
