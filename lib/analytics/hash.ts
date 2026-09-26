import { createHash } from 'node:crypto'

import {
  analyticsSnapshotPayloadSchema,
  type AnalyticsSnapshotPayload,
} from '@/lib/analytics/schema'

export function canonicalizeJson(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'bigint') return value.toString()
    return value
  }
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeJson(entry))
  }
  const record = value as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(record).sort()) {
    sorted[key] = canonicalizeJson(record[key])
  }
  return sorted
}

export function hashAnalyticsPayload(payload: AnalyticsSnapshotPayload): string {
  const parsed = analyticsSnapshotPayloadSchema.parse(payload)
  return createHash('sha256')
    .update(JSON.stringify(canonicalizeJson(parsed)))
    .digest('hex')
}
