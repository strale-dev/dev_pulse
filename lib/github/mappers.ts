import 'server-only'

import { contributionLevelFromGraphql } from '@/lib/github/fetchers'
import type {
  ContributionDayPayload,
  GitHubPublicEvent,
  GitHubRepo,
  GitHubUser,
} from '@/lib/github/types'

const PROFILE_STALE_MINUTES = 60
const REPO_STALE_MINUTES = 60

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function toUtcDateString(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  return d.toISOString().slice(0, 10)
}

export type GithubProfileInsert = {
  userId: string
  githubUserId: bigint
  login: string
  name: string | null
  bio: string | null
  avatarUrl: string | null
  company: string | null
  location: string | null
  blog: string | null
  twitterUsername: string | null
  publicRepos: number | null
  followers: number | null
  following: number | null
  githubCreatedAt: Date | null
  fetchedAt: Date
  staleAfter: Date
  raw: GitHubUser
}

export type ProfilesPatch = {
  githubLogin: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
}

export type RepositoryInsert = {
  id: bigint
  userId: string
  ownerLogin: string
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  homepage: string | null
  isFork: boolean
  isArchived: boolean
  isPrivate: boolean
  primaryLanguage: string | null
  stargazersCount: number
  forksCount: number
  openIssuesCount: number
  defaultBranch: string | null
  pushedAt: Date | null
  githubCreatedAt: Date | null
  githubUpdatedAt: Date | null
  fetchedAt: Date
  staleAfter: Date
  raw: GitHubRepo
}

export type RepositoryLanguageInsert = {
  repositoryId: bigint
  userId: string
  language: string
  bytes: bigint
  fetchedAt: Date
}

export type ContributionDayInsert = {
  userId: string
  day: string
  contributions: number
  level: number
  fetchedAt: Date
}

export type ActivityEventInsert = {
  userId: string
  day: string
  commits: number
  pullRequests: number
  issues: number
  codeReviews: number
}

export function mapProfileToGithubProfileRow(
  userId: string,
  profile: GitHubUser,
  fetchedAt: Date,
): GithubProfileInsert {
  const staleAfter = addMinutes(fetchedAt, PROFILE_STALE_MINUTES)
  return {
    userId,
    githubUserId: BigInt(profile.id),
    login: profile.login,
    name: profile.name ?? null,
    bio: profile.bio ?? null,
    avatarUrl: profile.avatar_url ?? null,
    company: profile.company ?? null,
    location: profile.location ?? null,
    blog: profile.blog ?? null,
    twitterUsername: profile.twitter_username ?? null,
    publicRepos: profile.public_repos ?? null,
    followers: profile.followers ?? null,
    following: profile.following ?? null,
    githubCreatedAt: profile.created_at ? new Date(profile.created_at) : null,
    fetchedAt,
    staleAfter,
    raw: profile,
  }
}

export function mapProfileToProfilesPatch(profile: GitHubUser): ProfilesPatch {
  return {
    githubLogin: profile.login,
    displayName: profile.name ?? profile.login,
    bio: profile.bio ?? null,
    avatarUrl: profile.avatar_url ?? null,
  }
}

export function mapRepoToRow(userId: string, repo: GitHubRepo, fetchedAt: Date): RepositoryInsert {
  const staleAfter = addMinutes(fetchedAt, REPO_STALE_MINUTES)
  return {
    id: BigInt(repo.id),
    userId,
    ownerLogin: repo.owner?.login ?? repo.full_name.split('/')[0] ?? '',
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description ?? null,
    htmlUrl: repo.html_url,
    homepage: repo.homepage ?? null,
    isFork: repo.fork ?? false,
    isArchived: repo.archived ?? false,
    isPrivate: repo.private ?? false,
    primaryLanguage: repo.language ?? null,
    stargazersCount: repo.stargazers_count ?? 0,
    forksCount: repo.forks_count ?? 0,
    openIssuesCount: repo.open_issues_count ?? 0,
    defaultBranch: repo.default_branch ?? null,
    pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
    githubCreatedAt: repo.created_at ? new Date(repo.created_at) : null,
    githubUpdatedAt: repo.updated_at ? new Date(repo.updated_at) : null,
    fetchedAt,
    staleAfter,
    raw: repo,
  }
}

export function mapLanguagesToRows(
  userId: string,
  repositoryId: bigint,
  languages: Record<string, number>,
  fetchedAt: Date,
): RepositoryLanguageInsert[] {
  return Object.entries(languages).map(([language, bytes]) => ({
    repositoryId,
    userId,
    language,
    bytes: BigInt(bytes),
    fetchedAt,
  }))
}

export function mapCalendarToContributionDays(
  userId: string,
  days: ContributionDayPayload[],
  fetchedAt: Date,
): ContributionDayInsert[] {
  return days.map((day) => ({
    userId,
    day: day.date,
    contributions: day.contributionCount,
    level: contributionLevelFromGraphql(day.contributionLevel),
    fetchedAt,
  }))
}

/**
 * Builds daily activity rows from two independent GitHub sources.
 *
 * - `commits` per day come from GraphQL `contributionCalendar` (`contributionCount`).
 *   That total includes every contribution type GitHub counts on the profile graph,
 *   not isolated git commits.
 * - `pull_requests` and `issues` come from REST `/users/{login}/events/public` only.
 *
 * Do not reconcile or dedupe these columns against each other — they are intentionally
 * heterogeneous and will not match a single GitHub API surface.
 */
export function mapActivityEvents(
  userId: string,
  calendarDays: ContributionDayPayload[],
  events: GitHubPublicEvent[],
): ActivityEventInsert[] {
  const byDay = new Map<string, ActivityEventInsert>()

  for (const day of calendarDays) {
    const key = toUtcDateString(day.date)
    byDay.set(key, {
      userId,
      day: key,
      commits: day.contributionCount,
      pullRequests: 0,
      issues: 0,
      codeReviews: 0,
    })
  }

  for (const event of events) {
    if (!event.created_at) continue
    const key = toUtcDateString(event.created_at)
    let row = byDay.get(key)
    if (!row) {
      row = {
        userId,
        day: key,
        commits: 0,
        pullRequests: 0,
        issues: 0,
        codeReviews: 0,
      }
      byDay.set(key, row)
    }

    if (event.type === 'PullRequestEvent') {
      row.pullRequests += 1
    } else if (event.type === 'IssuesEvent') {
      row.issues += 1
    }
  }

  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
}
