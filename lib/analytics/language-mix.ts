import {
  metricInsufficient,
  metricOk,
  type MetricResult,
} from '@/lib/analytics/metric-result'
import type { LanguageByteRow } from '@/lib/analytics/types'

export function aggregateLanguagePercentages(
  rows: LanguageByteRow[],
  limit = 5,
): Array<{ language: string; percentage: number }> {
  const bytesByLanguage = new Map<string, bigint>()
  for (const row of rows) {
    const prev = bytesByLanguage.get(row.language) ?? BigInt(0)
    bytesByLanguage.set(row.language, prev + row.bytes)
  }
  const totalBytes = [...bytesByLanguage.values()].reduce((a, b) => a + b, BigInt(0))
  return [...bytesByLanguage.entries()]
    .map(([language, bytes]) => ({
      language,
      percentage:
        totalBytes > BigInt(0)
          ? Math.round((Number(bytes) / Number(totalBytes)) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, limit)
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
