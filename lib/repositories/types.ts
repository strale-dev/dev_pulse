export type RepositoryLanguageSegment = {
  language: string
  percentage: number
  color: string
}

export type RepositoryListItem = {
  id: string
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  stargazersCount: number
  forksCount: number
  pushedAt: string | null
  githubUpdatedAt: string | null
  commitsLast90d: number | null
  languages: RepositoryLanguageSegment[]
}
