import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { POST } from '@/app/api/insights/route'
import * as cachePolicy from '@/lib/ai/cache-policy'
import * as generate from '@/lib/ai/generate'
import { forceReleaseInsightGenerationLock } from '@/lib/ai/insight-generation-lock'
import { INSIGHTS_IN_PROGRESS_MESSAGE } from '@/lib/ai/messages'
import { loadInsightView } from '@/lib/ai/insight-store'
import { db } from '@/lib/db'
import { aiInsights } from '@/lib/db/schema'

const TEST_USER_ID = '402f57c3-a73e-4ca2-a84a-a71a458d18c7'

const streamSpy = vi.fn()

type StreamOptions = Parameters<typeof generate.streamDeveloperInsights>[0]

vi.mock('@/lib/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: TEST_USER_ID } },
      }),
    },
  })),
}))

async function postInsights(body: { regenerate: boolean }) {
  return POST(
    new Request('http://localhost/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

async function readGeneratedAt() {
  const rows = await db
    .select({ generatedAt: aiInsights.generatedAt })
    .from(aiInsights)
    .where(eq(aiInsights.userId, TEST_USER_ID))
    .limit(1)
  return rows[0]?.generatedAt?.toISOString() ?? null
}

const mockInsightObject = {
  developmentStyle: 'mock',
  technology: 'mock',
  consistency: 'mock',
  recommendations: ['a', 'b', 'c'],
} as const

function mockStreamResponse(options?: StreamOptions) {
  streamSpy()
  queueMicrotask(() => {
    void options?.onFinish?.({
      object: { ...mockInsightObject, recommendations: [...mockInsightObject.recommendations] },
      error: undefined,
      usage: { totalTokens: 1, inputTokens: 1, outputTokens: 0 },
    })
  })
  return {
    result: {
      toTextStreamResponse: () =>
        new Response(JSON.stringify(mockInsightObject), {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }),
    },
    model: 'mock-model',
  }
}

function mockStreamWithDelayedFinish(delayFinishMs: number) {
  return (options: StreamOptions) => {
    streamSpy()
    setTimeout(() => {
      void options.onFinish?.({
        object: { ...mockInsightObject, recommendations: [...mockInsightObject.recommendations] },
        error: undefined,
        usage: { totalTokens: 1, inputTokens: 1, outputTokens: 0 },
      })
    }, delayFinishMs)
    return {
      result: {
        toTextStreamResponse: () =>
          new Response(JSON.stringify(mockInsightObject), {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          }),
      },
      model: 'mock-model',
    }
  }
}

describe('POST /api/insights integration', () => {
  beforeEach(() => {
    streamSpy.mockClear()
    vi.spyOn(generate, 'streamDeveloperInsights').mockImplementation(mockStreamResponse as never)
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    await forceReleaseInsightGenerationLock(TEST_USER_ID)
  })

  it('serves two refresh-equivalent loads from cache without calling OpenAI', async () => {
    const infoLogs: unknown[][] = []
    vi.spyOn(console, 'info').mockImplementation((...args: unknown[]) => {
      infoLogs.push(args)
    })

    const beforeGeneratedAt = await readGeneratedAt()
    expect(beforeGeneratedAt).not.toBeNull()

    const view1 = await loadInsightView(TEST_USER_ID)
    const view2 = await loadInsightView(TEST_USER_ID)
    expect(view1.generatedAt).toBe(view2.generatedAt)
    expect(view1.insight).not.toBeNull()

    const first = await postInsights({ regenerate: false })
    expect(first.status).toBe(200)
    expect(first.headers.get('X-Insights-Cache')).toBe('hit')
    expect(streamSpy).not.toHaveBeenCalled()

    const second = await postInsights({ regenerate: false })
    expect(second.status).toBe(200)
    expect(second.headers.get('X-Insights-Cache')).toBe('hit')
    expect(streamSpy).not.toHaveBeenCalled()

    const afterGeneratedAt = await readGeneratedAt()
    expect(afterGeneratedAt).toBe(beforeGeneratedAt)

    const cacheHits = infoLogs.filter((entry) => entry[0] === 'ai_insight_cache_hit')
    expect(cacheHits).toHaveLength(2)
    expect(cacheHits[0]?.[1]).toMatchObject({ generatedAt: beforeGeneratedAt })
  })

  it('returns a safe failure for regenerate when OPENAI_API_KEY is invalid', async () => {
    vi.restoreAllMocks()
    vi.spyOn(cachePolicy, 'isRegenerateCoolingDown').mockReturnValue(false)
    const errorLogs: unknown[][] = []
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errorLogs.push(args)
    })

    const realKey = process.env.OPENAI_API_KEY
    expect(realKey).toBeTruthy()
    vi.stubEnv('OPENAI_API_KEY', `${realKey}x`)

    const response = await postInsights({ regenerate: true })
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).not.toMatch(/sk-[a-zA-Z0-9_-]+/i)
    expect(body.toLowerCase()).not.toContain('incorrect api key')
    expect(body.toLowerCase()).not.toContain('openai')

    const errorText = JSON.stringify(errorLogs)
    expect(errorText.toLowerCase()).not.toContain('incorrect api key')
    expect(errorText).not.toMatch(/sk-[a-zA-Z0-9_-]+/i)
  }, 120_000)

  it('allows only one parallel regenerate while the first generation holds the lock', async () => {
    vi.spyOn(cachePolicy, 'isRegenerateCoolingDown').mockReturnValue(false)
    streamSpy.mockClear()
    vi.spyOn(generate, 'streamDeveloperInsights').mockImplementation(
      mockStreamWithDelayedFinish(400) as never,
    )

    const [first, second] = await Promise.all([
      postInsights({ regenerate: true }),
      postInsights({ regenerate: true }),
    ])

    expect(streamSpy).toHaveBeenCalledTimes(1)

    const statuses = [first.status, second.status].sort((a, b) => a - b)
    expect(statuses).toEqual([200, 429])

    const blocked = first.status === 429 ? first : second
    const payload = (await blocked.json()) as { error: string }
    expect(payload.error).toBe(INSIGHTS_IN_PROGRESS_MESSAGE)

    await new Promise((resolve) => setTimeout(resolve, 450))
  })
})
