import type { RestEndpointMethodTypes } from '@octokit/rest'

export type GitHubUser = RestEndpointMethodTypes['users']['getAuthenticated']['response']['data']

export type GitHubRepo =
  RestEndpointMethodTypes['repos']['listForAuthenticatedUser']['response']['data'][number]

export type GitHubPublicEvent =
  RestEndpointMethodTypes['activity']['listPublicEventsForUser']['response']['data'][number]

export type ContributionDayPayload = {
  date: string
  contributionCount: number
  contributionLevel:
    | 'NONE'
    | 'FIRST_QUARTILE'
    | 'SECOND_QUARTILE'
    | 'THIRD_QUARTILE'
    | 'FOURTH_QUARTILE'
}

export type RepoCommit90dPayload = {
  id: bigint
  name: string
  commits: number
}

export type ContributionCalendarResult = {
  days: ContributionDayPayload[]
  totalContributions: number
  repoCommitsLast90d: RepoCommit90dPayload[]
}
