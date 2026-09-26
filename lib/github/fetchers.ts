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
  query ContributionCalendar($from: DateTime!, $to: DateTime!) {
    viewer {
      contributionsCollection(from: $from, to: $to) {
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

export function calendarWindowUtc(): { from: string; to: string } {
  const to = new Date()
  to.setUTCHours(23, 59, 59, 999)
  const from = new Date(to)
  from.setUTCDate(from.getUTCDate() - 52 * 7)
  from.setUTCHours(0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString() }
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
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number
        weeks: Array<{
          contributionDays: ContributionDayPayload[]
        }>
      }
    }
  }
}

export async function fetchContributionCalendar(
  graphqlClient: ReturnType<typeof import('@octokit/graphql').graphql.defaults>,
): Promise<ContributionCalendarResult> {
  return runQueued(async () => {
    const { from, to } = calendarWindowUtc()
    const data = await graphqlClient<GraphqlCalendarResponse>(CONTRIBUTION_CALENDAR_QUERY, {
      from,
      to,
    })

    const calendar = data.viewer.contributionsCollection.contributionCalendar
    const days = calendar.weeks.flatMap((week) => week.contributionDays)

    return {
      days,
      totalContributions: calendar.totalContributions,
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
