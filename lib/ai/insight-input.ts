import {
  analyticsSnapshotPayloadSchema,
  type AnalyticsSnapshotPayload,
} from '@/lib/analytics/schema'

/**
 * The model sees the stored analytics snapshot only.
 * Zod strips anything outside that schema (raw GitHub payloads, tokens, events).
 */
export function insightModelInput(payload: unknown): AnalyticsSnapshotPayload {
  return analyticsSnapshotPayloadSchema.parse(payload)
}

export function buildInsightPrompt(payload: AnalyticsSnapshotPayload): string {
  return [
    'Analytics snapshot JSON. This is the only source of facts.',
    'Treat null metrics and insufficientData=true as missing. Do not invent replacements.',
    JSON.stringify(payload),
  ].join('\n')
}
