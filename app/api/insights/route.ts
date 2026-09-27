import { insightExpiresAt, isRegenerateCoolingDown } from '@/lib/ai/cache-policy'
import { streamDeveloperInsights } from '@/lib/ai/generate'
import { resolveInsightsModel } from '@/lib/ai/model'
import { buildInsightPrompt, insightModelInput } from '@/lib/ai/insight-input'
import { tryAcquireInsightGenerationLock } from '@/lib/ai/insight-generation-lock'
import { INSIGHTS_IN_PROGRESS_MESSAGE } from '@/lib/ai/messages'
import {
  loadFreshInsight,
  loadLatestInsightGeneratedAt,
  loadLatestSnapshot,
  upsertAiInsight,
} from '@/lib/ai/insight-store'
import { insightsRequestSchema } from '@/lib/ai/schema'
import { createClient } from '@/lib/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function unavailable() {
  return Response.json({ error: 'unavailable' }, { status: 503 })
}

function logInsight(event: 'ai_insight' | 'ai_insight_error', fields: Record<string, string | number | null>) {
  if (event === 'ai_insight_error') {
    console.error(event, fields)
    return
  }
  console.info(event, fields)
}

function logInsightCacheHit(fields: Record<string, string | number | null>) {
  console.info('ai_insight_cache_hit', fields)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let regenerate = false
  try {
    const json: unknown = await request.json()
    regenerate = insightsRequestSchema.parse(json).regenerate
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 400 })
  }

  const snapshot = await loadLatestSnapshot(user.id)
  if (!snapshot) {
    return Response.json({ error: 'no_snapshot' }, { status: 404 })
  }

  if (!regenerate) {
    const cached = await loadFreshInsight(user.id, snapshot.snapshotHash)
    if (cached) {
      logInsightCacheHit({
        userId: user.id,
        snapshotHash: snapshot.snapshotHash,
        generatedAt: cached.generatedAt,
      })
      return new Response(JSON.stringify(cached.insight), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Insights-Cache': 'hit',
        },
      })
    }
  } else {
    const latestGeneratedAt = await loadLatestInsightGeneratedAt(user.id)
    if (latestGeneratedAt && isRegenerateCoolingDown(latestGeneratedAt)) {
      return Response.json({ error: 'cooldown' }, { status: 429 })
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    logInsight('ai_insight_error', { userId: user.id, reason: 'missing_api_key' })
    return unavailable()
  }

  let prompt: string
  try {
    prompt = buildInsightPrompt(insightModelInput(snapshot.payload))
  } catch {
    logInsight('ai_insight_error', { userId: user.id, reason: 'invalid_snapshot' })
    return unavailable()
  }

  const lock = await tryAcquireInsightGenerationLock(user.id)
  if (!lock) {
    return Response.json({ error: INSIGHTS_IN_PROGRESS_MESSAGE }, { status: 429 })
  }

  const started = Date.now()
  const model = resolveInsightsModel(process.env.OPENAI_INSIGHTS_MODEL)
  const { release } = lock

  try {
    const { result } = streamDeveloperInsights({
      prompt,
      model,
      onError: () => {
        logInsight('ai_insight_error', { userId: user.id, reason: 'stream_failed', model })
        void release()
      },
      onFinish: async ({ object, error, usage }) => {
        try {
          const latencyMs = Date.now() - started
          const tokensUsed = usage.totalTokens ?? null
          if (error || !object) {
            logInsight('ai_insight_error', {
              userId: user.id,
              reason: 'invalid_object',
              latencyMs,
              model,
            })
            return
          }

          logInsight('ai_insight', { userId: user.id, tokensUsed, latencyMs, model })

          const generatedAt = new Date()
          try {
            await upsertAiInsight({
              userId: user.id,
              snapshotId: snapshot.id,
              snapshotHash: snapshot.snapshotHash,
              model,
              insight: object,
              tokensUsed,
              latencyMs,
              generatedAt,
              expiresAt: insightExpiresAt(generatedAt),
            })
          } catch {
            logInsight('ai_insight_error', { userId: user.id, reason: 'persist_failed', model })
          }
        } finally {
          await release()
        }
      },
    })

    return result.toTextStreamResponse()
  } catch {
    await release()
    logInsight('ai_insight_error', { userId: user.id, reason: 'stream_start_failed' })
    return unavailable()
  }
}
