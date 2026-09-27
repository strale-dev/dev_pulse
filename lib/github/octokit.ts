import 'server-only'

import { graphql } from '@octokit/graphql'
import { Octokit } from '@octokit/rest'
import { retry } from '@octokit/plugin-retry'
import { throttling } from '@octokit/plugin-throttling'

const OctokitWithPlugins = Octokit.plugin(throttling, retry)

export type DevPulseOctokit = InstanceType<typeof OctokitWithPlugins>

let lastRateLimitRemaining: number | null = null
let lastRateLimitReset: Date | null = null

function headerValue(
  headers: Record<string, unknown> | { [key: string]: string | undefined },
  name: string,
): unknown {
  if (name in headers) {
    return headers[name as keyof typeof headers]
  }
  const found = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )
  return found?.[1]
}

export function noteRateLimitFromResponse(response: {
  headers?: Record<string, unknown> | { [key: string]: string | undefined }
}) {
  const headers = response.headers ?? {}
  const remaining = headerValue(headers, 'x-ratelimit-remaining')
  if (remaining !== undefined && remaining !== null) {
    const parsed = Number.parseInt(String(remaining), 10)
    if (!Number.isNaN(parsed)) {
      lastRateLimitRemaining = parsed
    }
  }
  const reset = headerValue(headers, 'x-ratelimit-reset')
  if (reset !== undefined && reset !== null) {
    const unix = Number.parseInt(String(reset), 10)
    if (!Number.isNaN(unix) && unix > 0) {
      lastRateLimitReset = new Date(unix * 1000)
    }
  }
}

export function createOctokit(accessToken: string): DevPulseOctokit {
  const octokit = new OctokitWithPlugins({
    auth: accessToken,
    throttle: {
      onRateLimit: (retryAfter, options, client) => {
        client.log.warn(
          `GitHub rate limit hit for ${options.method} ${options.url}; retrying after ${retryAfter}s`,
        )
        return true
      },
      onSecondaryRateLimit: (retryAfter, options, client) => {
        client.log.warn(
          `GitHub secondary rate limit for ${options.method} ${options.url}; retrying after ${retryAfter}s`,
        )
        return true
      },
    },
    retry: {
      doNotRetry: [400, 401, 403, 404, 422],
    },
  })

  octokit.hook.after('request', async (response) => {
    noteRateLimitFromResponse(response)
  })

  return octokit
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

export function getLastRateLimitReset(): Date | null {
  return lastRateLimitReset
}

export function resetLastRateLimitRemaining() {
  lastRateLimitRemaining = null
  lastRateLimitReset = null
}
