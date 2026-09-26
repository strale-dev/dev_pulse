export const INSUFFICIENT_COMMITS_THRESHOLD = 10

export type MetricResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'insufficient_data' }

export function metricOk<T>(value: T): MetricResult<T> {
  return { status: 'ok', value }
}

export function metricInsufficient<T>(): MetricResult<T> {
  return { status: 'insufficient_data' }
}

export function unwrapMetric<T>(result: MetricResult<T>): T | null {
  return result.status === 'ok' ? result.value : null
}
