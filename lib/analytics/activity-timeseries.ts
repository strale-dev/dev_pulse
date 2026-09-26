import {
  INSUFFICIENT_COMMITS_THRESHOLD,
  metricInsufficient,
  metricOk,
  type MetricResult,
} from '@/lib/analytics/metric-result'
import type { ActivityDayRow } from '@/lib/analytics/types'

export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export function computeActivityTrend(
  activityRows: ActivityDayRow[],
  window90Start: string,
  window180Start: string,
): 'up' | 'down' | 'flat' {
  const recent90 = activityRows.filter((r) => r.day >= window90Start)
  const prev90 = activityRows.filter(
    (r) => r.day >= window180Start && r.day < window90Start,
  )
  const recentSum = recent90.reduce((s, r) => s + r.commits, 0)
  const prevSum = prev90.reduce((s, r) => s + r.commits, 0)
  if (recentSum > prevSum) return 'up'
  if (recentSum < prevSum) return 'down'
  return 'flat'
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2
  }
  return sorted[mid]!
}

export function computeMostActiveWeekday(
  activityRows: ActivityDayRow[],
): MetricResult<string> {
  const totalCommits = activityRows.reduce((sum, row) => sum + row.commits, 0)
  if (activityRows.length === 0 || totalCommits < INSUFFICIENT_COMMITS_THRESHOLD) {
    return metricInsufficient()
  }

  const commitsByWeekday = new Map<number, number[]>()
  for (const row of activityRows) {
    const weekday = new Date(`${row.day}T12:00:00.000Z`).getUTCDay()
    const bucket = commitsByWeekday.get(weekday) ?? []
    bucket.push(row.commits)
    commitsByWeekday.set(weekday, bucket)
  }

  let bestWeekday: number | null = null
  let bestMedian = -1
  for (let weekday = 0; weekday < WEEKDAY_LABELS.length; weekday += 1) {
    const samples = commitsByWeekday.get(weekday)
    if (!samples || samples.length === 0) continue
    const weekdayMedian = median(samples)
    if (weekdayMedian > bestMedian) {
      bestMedian = weekdayMedian
      bestWeekday = weekday
    }
  }

  if (bestWeekday === null) return metricInsufficient()
  const label = WEEKDAY_LABELS[bestWeekday]
  if (!label) return metricInsufficient()
  return metricOk(label)
}

export function computeMostActiveHourUTC(hours: number[]): MetricResult<number> {
  if (hours.length < INSUFFICIENT_COMMITS_THRESHOLD) {
    return metricInsufficient()
  }

  const counts = Array.from({ length: 24 }, () => 0)
  for (const hour of hours) {
    if (hour >= 0 && hour <= 23) {
      counts[hour] = (counts[hour] ?? 0) + 1
    }
  }

  let bestHour = 0
  let bestCount = 0
  for (let hour = 0; hour < 24; hour += 1) {
    const count = counts[hour] ?? 0
    if (count > bestCount) {
      bestCount = count
      bestHour = hour
    }
  }

  if (bestCount === 0) return metricInsufficient()
  return metricOk(bestHour)
}

export function computeAvgCommitsPerActiveDay(
  activityRows: ActivityDayRow[],
): MetricResult<number> {
  const totalCommits = activityRows.reduce((sum, row) => sum + row.commits, 0)
  const activeDays = activityRows.filter((row) => row.commits >= 1).length
  if (totalCommits < INSUFFICIENT_COMMITS_THRESHOLD || activeDays === 0) {
    return metricInsufficient()
  }
  return metricOk(Math.round((totalCommits / activeDays) * 100) / 100)
}
