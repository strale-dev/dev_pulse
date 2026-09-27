import {
  metricInsufficient,
  metricOk,
  type MetricResult,
} from '@/lib/analytics/metric-result'
import type { LanguageByteRow } from '@/lib/analytics/types'

function bytesByLanguageMap(rows: LanguageByteRow[]): Map<string, bigint> {
  const bytesByLanguage = new Map<string, bigint>()
  for (const row of rows) {
    const prev = bytesByLanguage.get(row.language) ?? BigInt(0)
    bytesByLanguage.set(row.language, prev + row.bytes)
  }
  return bytesByLanguage
}

function percentageFromBytes(bytes: bigint, totalBytes: bigint): number {
  return totalBytes > BigInt(0)
    ? Math.round((Number(bytes) / Number(totalBytes)) * 1000) / 10
    : 0
}

export function aggregateLanguagePercentages(
  rows: LanguageByteRow[],
  limit = 5,
): Array<{ language: string; percentage: number }> {
  const bytesByLanguage = bytesByLanguageMap(rows)
  const totalBytes = [...bytesByLanguage.values()].reduce((a, b) => a + b, BigInt(0))
  return [...bytesByLanguage.entries()]
    .map(([language, bytes]) => ({
      language,
      percentage: percentageFromBytes(bytes, totalBytes),
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit)
}

export function aggregateLanguageBreakdown(
  rows: LanguageByteRow[],
  limit = 5,
): Array<{ language: string; percentage: number }> {
  const bytesByLanguage = bytesByLanguageMap(rows)
  const totalBytes = [...bytesByLanguage.values()].reduce((a, b) => a + b, BigInt(0))
  if (totalBytes === BigInt(0)) {
    return []
  }

  const sorted = [...bytesByLanguage.entries()]
    .map(([language, bytes]) => ({
      language,
      bytes,
      percentage: percentageFromBytes(bytes, totalBytes),
    }))
    .sort((a, b) => b.percentage - a.percentage)

  const top = sorted.slice(0, limit).map(({ language, percentage }) => ({
    language,
    percentage,
  }))

  if (sorted.length <= limit) {
    return top
  }

  const topBytes = sorted
    .slice(0, limit)
    .reduce((sum, entry) => sum + entry.bytes, BigInt(0))
  const otherBytes = totalBytes - topBytes

  return [
    ...top,
    {
      language: 'Other',
      percentage: percentageFromBytes(otherBytes, totalBytes),
    },
  ]
}

export function computeMostUsedLanguage(
  rows: LanguageByteRow[],
): MetricResult<{ language: string; percentage: number }> {
  const totalBytes = rows.reduce((sum, row) => sum + row.bytes, BigInt(0))
  if (rows.length === 0 || totalBytes === BigInt(0)) {
    return metricInsufficient()
  }
  const top = aggregateLanguagePercentages(rows, 1)[0]
  if (!top) return metricInsufficient()
  return metricOk(top)
}
