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

export type RepoCommit90d = {
  id: bigint
  name: string
  commits: number
}

export type TopRepositoryRow = {
  name: string
  commitsLast90d: number | null
  stars: number
  id: bigint
}
