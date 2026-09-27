import type { RepositoryListItem } from '@/lib/repositories/types'

export type RepositorySortKey =
  | 'most_stars'
  | 'most_active'
  | 'recently_updated'
  | 'most_commits'

export const REPOSITORY_SORT_OPTIONS: Array<{ value: RepositorySortKey; label: string }> = [
  { value: 'most_stars', label: 'Most stars' },
  { value: 'most_active', label: 'Most active (recent push)' },
  { value: 'recently_updated', label: 'Recently updated' },
  { value: 'most_commits', label: 'Most commits' },
]

function normalizeSearchText(value: string): string {
  return value.toLowerCase().trim()
}

function haystackForRepo(repo: RepositoryListItem): string {
  const description = repo.description ?? ''
  return normalizeSearchText(`${repo.name} ${repo.fullName} ${description}`)
}

export function filterRepositoriesByQuery(
  repos: RepositoryListItem[],
  query: string,
): RepositoryListItem[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return repos
  }

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return repos
  }

  return repos.filter((repo) => {
    const haystack = haystackForRepo(repo)
    return tokens.every((token) => haystack.includes(token))
  })
}

function compareNullableDates(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a > b ? -1 : 1
}

function compareNullableCommitsDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return b - a
}

export function sortRepositories(
  repos: RepositoryListItem[],
  sort: RepositorySortKey,
): RepositoryListItem[] {
  const sorted = [...repos]

  switch (sort) {
    case 'most_stars':
      sorted.sort((a, b) => b.stargazersCount - a.stargazersCount)
      break
    case 'most_active':
      sorted.sort((a, b) => compareNullableDates(a.pushedAt, b.pushedAt))
      break
    case 'recently_updated':
      sorted.sort((a, b) => compareNullableDates(a.githubUpdatedAt, b.githubUpdatedAt))
      break
    case 'most_commits':
      sorted.sort((a, b) => compareNullableCommitsDesc(a.commitsLast90d, b.commitsLast90d))
      break
    default:
      break
  }

  return sorted
}
