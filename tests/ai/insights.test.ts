import { describe, expect, it } from 'vitest'

import {
  INSIGHTS_TTL_MS,
  REGENERATE_COOLDOWN_MS,
  insightExpiresAt,
  isInsightCacheFresh,
  isRegenerateCoolingDown,
} from '@/lib/ai/cache-policy'
import { buildInsightPrompt, insightModelInput } from '@/lib/ai/insight-input'
import { INSIGHTS_FAILURE_MESSAGE } from '@/lib/ai/messages'
import { DEFAULT_INSIGHTS_MODEL, resolveInsightsModel } from '@/lib/ai/model'
import { DEVPULSE_SYSTEM_PROMPT, INSIGHTS_GUARDRAIL } from '@/lib/ai/prompt'
import { insightsSchema } from '@/lib/ai/schema'
import type { AnalyticsSnapshotPayload } from '@/lib/analytics/schema'

const snapshot: AnalyticsSnapshotPayload = {
  totalCommits: 4,
  totalPRs: 0,
  totalIssues: 0,
  totalRepos: 1,
  topLanguages: [{ language: 'TypeScript', percentage: 100 }],
  mostActiveDay: null,
  mostActiveHourUTC: null,
  longestStreak: 1,
  currentStreak: 0,
  topRepositories: [{ name: 'dev_pulse', commitsLast90d: null, stars: 2 }],
  activityTrend: 'flat',
  windowDays: 365,
  avgCommitsPerActiveDay: null,
  insufficientData: true,
}

const insight = {
  developmentStyle: 'Commits are sparse across the window. The snapshot does not support a stronger claim.',
  technology: 'TypeScript is the only language with a share in the snapshot. No other language trend is present.',
  consistency: 'Streaks are short and several timing metrics are missing. There is not enough activity to describe a habit.',
  recommendations: [
    'Keep committing on days you already touch the repo.',
    'Add a second language only if the snapshot starts showing it.',
    'Revisit streaks after more than ten commits are recorded.',
  ],
}

describe('insights schema', () => {
  it('accepts 3 to 5 recommendation bullets', () => {
    expect(insightsSchema.parse(insight).recommendations).toHaveLength(3)
    expect(
      insightsSchema.parse({
        ...insight,
        recommendations: [...insight.recommendations, 'Try a shorter feedback loop.', 'Note the weekday once it is known.'],
      }).recommendations,
    ).toHaveLength(5)
  })

  it('rejects fewer than 3 or more than 5 recommendations', () => {
    expect(
      insightsSchema.safeParse({ ...insight, recommendations: insight.recommendations.slice(0, 2) }).success,
    ).toBe(false)
    expect(
      insightsSchema.safeParse({
        ...insight,
        recommendations: [...insight.recommendations, 'a', 'b', 'c'],
      }).success,
    ).toBe(false)
  })
})

describe('insights prompt', () => {
  it('contains the required guardrail verbatim', () => {
    expect(DEVPULSE_SYSTEM_PROMPT).toContain(INSIGHTS_GUARDRAIL)
    expect(INSIGHTS_GUARDRAIL).toBe(
      'Only make claims that are directly supported by the numbers provided. Do not invent activity, repos, or trends. If data is insufficient, say so explicitly.',
    )
  })

  it('uses the specified failure toast', () => {
    expect(INSIGHTS_FAILURE_MESSAGE).toBe(
      "We couldn't generate insights right now. Please try again in a minute.",
    )
  })
})

describe('insight model input', () => {
  it('keeps insufficient_data fields and drops raw GitHub extras', () => {
    const input = insightModelInput({
      ...snapshot,
      rawEvents: [{ type: 'PushEvent' }],
      provider_token: 'secret',
    })

    expect(input.insufficientData).toBe(true)
    expect(input.mostActiveDay).toBeNull()
    expect(input.mostActiveHourUTC).toBeNull()
    expect(input.avgCommitsPerActiveDay).toBeNull()
    expect(input).not.toHaveProperty('rawEvents')
    expect(input).not.toHaveProperty('provider_token')
    expect(buildInsightPrompt(input)).toContain('"insufficientData":true')
    expect(buildInsightPrompt(input)).not.toContain('PushEvent')
    expect(buildInsightPrompt(input)).not.toContain('secret')
  })
})

describe('insight cache policy', () => {
  const generatedAt = new Date('2026-09-27T12:00:00.000Z')

  it('expires 24 hours after generation', () => {
    const expiresAt = insightExpiresAt(generatedAt)
    expect(expiresAt.getTime() - generatedAt.getTime()).toBe(INSIGHTS_TTL_MS)
    expect(isInsightCacheFresh(expiresAt, new Date(expiresAt.getTime() - 1))).toBe(true)
    expect(isInsightCacheFresh(expiresAt, expiresAt)).toBe(false)
  })

  it('blocks manual regenerate for 60 seconds', () => {
    expect(isRegenerateCoolingDown(generatedAt, new Date(generatedAt.getTime() + REGENERATE_COOLDOWN_MS - 1))).toBe(
      true,
    )
    expect(isRegenerateCoolingDown(generatedAt, new Date(generatedAt.getTime() + REGENERATE_COOLDOWN_MS))).toBe(
      false,
    )
  })
})

describe('insights model', () => {
  it('defaults to gpt-4o-mini and honors an override', () => {
    expect(DEFAULT_INSIGHTS_MODEL).toBe('gpt-4o-mini')
    expect(resolveInsightsModel(undefined)).toBe('gpt-4o-mini')
    expect(resolveInsightsModel('  ')).toBe('gpt-4o-mini')
    expect(resolveInsightsModel('gpt-4.1-mini')).toBe('gpt-4.1-mini')
  })
})
