import 'server-only'

import { graphql } from '@octokit/graphql'
import { Octokit } from '@octokit/rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

const OctokitWithPlugins = Octokit.plugin(throttling, retry)

export type DevPulseOctokit = InstanceType<typeof OctokitWithPlugins>

let lastRateLimitRemaining: number | null = null

export function noteRateLimitFromResponse(response: {
  headers?: Record<string, unknown> | { [key: string]: string | undefined }
}) {
  const headers = response.headers ?? {}
  const remaining =
    'x-ratelimit-remaining' in headers
      ? headers['x-ratelimit-remaining']
      : undefined
  if (remaining !== undefined) {
    const parsed = Number.parseInt(String(remaining), 10)
    if (!Number.isNaN(parsed)) {
      lastRateLimitRemaining = parsed
    }
  }
}

export function createOctokit(accessToken: string): DevPulseOctokit {
  return new OctokitWithPlugins({
    auth: accessToken,
    throttle: {
      onRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(
          `GitHub rate limit hit for ${options.method} ${options.url}; retrying after ${retryAfter}s`,
        )
        return true
      },
      onSecondaryRateLimit: (retryAfter, options, octokit) => {
        octokit.log.warn(
          `GitHub secondary rate limit for ${options.method} ${options.url}; retrying after ${retryAfter}s`,
        )
        return true
      },
    },
    retry: {
      doNotRetry: [400, 401, 403, 404, 422],
    },
  })
}

export function createGraphqlClient(accessToken: string) {
  return graphql.defaults({
    headers: {
      authorization: `token ${accessToken}`,
    },
  })
}

export function getLastRateLimitRemaining(): number | null {
  return lastRateLimitRemaining
}

export function resetLastRateLimitRemaining() {
  lastRateLimitRemaining = null
}
