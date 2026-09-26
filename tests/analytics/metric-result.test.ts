import { describe, expect, it } from 'vitest'

import {
  INSUFFICIENT_COMMITS_THRESHOLD,
  metricInsufficient,
  metricOk,
  unwrapMetric,
} from '@/lib/analytics/metric-result'

describe('MetricResult helpers', () => {
  it('exposes the 10-commit sufficiency threshold', () => {
    expect(INSUFFICIENT_COMMITS_THRESHOLD).toBe(10)
  })

  it('unwraps ok values and maps insufficient to null', () => {
    expect(unwrapMetric(metricOk(4))).toBe(4)
    expect(unwrapMetric(metricInsufficient<number>())).toBeNull()
  })
})
