import 'server-only'

import { noteRateLimitFromResponse, type DevPulseOctokit } from '@/lib/github/octokit'
import { runQueued } from '@/lib/github/queue'
import type {
  ContributionCalendarResult,
  ContributionDayPayload,
  GitHubPublicEvent,
  GitHubRepo,
  GitHubUser,
} from '@/lib/github/types'

const CONTRIBUTION_CALENDAR_QUERY = `
  query ContributionCalendar($from: DateTime!, $to: DateTime!, $from90: DateTime!) {
    viewer {
      calendar: contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              contributionLevel
            }
          }
        }
      }
      last90: contributionsCollection(from: $from90, to: $to) {
        commitContributionsByRepository(maxRepositories: 100) {
          repository {
            name
            databaseId
          }
          contributions {
            totalCount
          }
        }
      }
    }
  }
`

function contributionLevelToSmallint(level: ContributionDayPayload['contributionLevel']): number {
  switch (level) {
    case 'NONE':
      return 0
    case 'FIRST_QUARTILE':
      return 1
    case 'SECOND_QUARTILE':
      return 2
    case 'THIRD_QUARTILE':
      return 3
    case 'FOURTH_QUARTILE':
      return 4
    default:
      return 0
  }
}

export function contributionLevelFromGraphql(
  level: ContributionDayPayload['contributionLevel'],
): number {
  return contributionLevelToSmallint(level)
}

export function calendarWindowUtc(): { from: string; to: string; from90: string } {
  const to = new Date()
  to.setUTCHours(23, 59, 59, 999)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 52 * 7)
  from.setUTCHours(0, 0, 0, 0)
  const from90 = new Date(to)
  from90.setUTCDate(from90.getUTCDate() - 90)
  from90.setUTCHours(0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString(), from90: from90.toISOString() }
}

export async function fetchProfile(octokit: DevPulseOctokit): Promise<GitHubUser> {
  return runQueued(async () => {
    const response = await octokit.rest.users.getAuthenticated()
    noteRateLimitFromResponse(response)
    return response.data as GitHubUser
  })
}

export async function fetchRepos(octokit: DevPulseOctokit): Promise<GitHubRepo[]> {
  return runQueued(async () => {
    const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      per_page: 100,
      sort: 'pushed',
      direction: 'desc',
      visibility: 'public',
    })
    return repos.filter((repo) => !repo.private) as GitHubRepo[]
  })
}

export async function fetchLanguages(
  octokit: DevPulseOctokit,
  owner: string,
  repo: string,
): Promise<Record<string, number>> {
  return runQueued(async () => {
    const { data } = await octokit.rest.repos.listLanguages({ owner, repo })
    return data
  })
}

type GraphqlCalendarResponse = {
  viewer: {
    calendar: {
      contributionCalendar: {
        totalContributions: number
        weeks: Array<{
          contributionDays: ContributionDayPayload[]
        }>
      }
    }
    last90: {
      commitContributionsByRepository: Array<{
        repository: { name: string; databaseId: number | null }
        contributions: { totalCount: number }
      }>
    }
  }
}

export async function fetchContributionCalendar(
  graphqlClient: ReturnType<typeof import('@octokit/graphql').graphql.defaults>,
): Promise<ContributionCalendarResult> {
  return runQueued(async () => {
    const { from, to, from90 } = calendarWindowUtc()
    const data = await graphqlClient<GraphqlCalendarResponse>(CONTRIBUTION_CALENDAR_QUERY, {
      from,
      to,
      from90,
    })

    const calendar = data.viewer.calendar.contributionCalendar
    const days = calendar.weeks.flatMap((week) => week.contributionDays)
    const repoCommitsLast90d = data.viewer.last90.commitContributionsByRepository
      .filter((entry) => entry.repository.databaseId != null)
      .map((entry) => ({
        id: BigInt(entry.repository.databaseId as number),
        name: entry.repository.name,
        commits: entry.contributions.totalCount,
      }))

    return {
      days,
      totalContributions: calendar.totalContributions,
      repoCommitsLast90d,
    }
  })
}

export async function fetchRecentEvents(
  octokit: DevPulseOctokit,
  login: string,
  windowDays = 90,
): Promise<GitHubPublicEvent[]> {
  return runQueued(async () => {
    const cutoff = new Date()
    cutoff.setUTCDate(cutoff.getUTCDate() - windowDays)
    cutoff.setUTCHours(0, 0, 0, 0)

    const events = await octokit.paginate(octokit.rest.activity.listPublicEventsForUser, {
      username: login,
      per_page: 100,
    })

    return (events as GitHubPublicEvent[]).filter((event) => {
      if (!event.created_at) return false
      return new Date(event.created_at) >= cutoff
    })
  })
}
