import 'server-only'

import { generateObject, streamObject, type LanguageModelUsage } from 'ai'
import { openai } from '@ai-sdk/openai'

import { resolveInsightsModel } from '@/lib/ai/model'
import { DEVPULSE_SYSTEM_PROMPT } from '@/lib/ai/prompt'
import { insightsSchema, type Insights } from '@/lib/ai/schema'

type InsightFinishEvent = {
  object: Insights | undefined
  error: unknown
  usage: LanguageModelUsage
}

type StreamInsightsOptions = {
  prompt: string
  model?: string
  onFinish?: (event: InsightFinishEvent) => Promise<void> | void
  onError?: (error: unknown) => void
}

function insightsModel(modelId: string) {
  return openai(modelId)
}

export function streamDeveloperInsights(options: StreamInsightsOptions) {
  const model = options.model ?? resolveInsightsModel(process.env.OPENAI_INSIGHTS_MODEL)
  const result = streamObject({
    model: insightsModel(model),
    schema: insightsSchema,
    schemaName: 'DevPulseInsights',
    schemaDescription:
      'Developer insights grounded only in the provided analytics snapshot.',
    system: DEVPULSE_SYSTEM_PROMPT,
    prompt: options.prompt,
    temperature: 0.2,
    maxOutputTokens: 800,
    onError: ({ error }) => {
      options.onError?.(error)
    },
    onFinish: async (event) => {
      await options.onFinish?.({
        object: event.object,
        error: event.error,
        usage: event.usage,
      })
    },
  })

  return { result, model }
}

export async function generateDeveloperInsights(prompt: string, modelId?: string) {
  const model = modelId ?? resolveInsightsModel(process.env.OPENAI_INSIGHTS_MODEL)
  const started = Date.now()
  const generated = await generateObject({
    model: insightsModel(model),
    schema: insightsSchema,
    schemaName: 'DevPulseInsights',
    schemaDescription:
      'Developer insights grounded only in the provided analytics snapshot.',
    system: DEVPULSE_SYSTEM_PROMPT,
    prompt,
    temperature: 0.2,
    maxOutputTokens: 800,
  })

  return {
    object: generated.object,
    model,
    tokensUsed: generated.usage.totalTokens ?? null,
    latencyMs: Date.now() - started,
  }
}
