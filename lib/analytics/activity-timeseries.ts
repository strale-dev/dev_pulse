import {
  INSUFFICIENT_COMMITS_THRESHOLD,
  metricInsufficient,
  metricOk,
  type MetricResult,
} from '@/lib/analytics/metric-result'
import type { ActivityDayRow } from '@/lib/analytics/types'

export const ACTIVITY_CHART_RANGES = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
  '1Y': 365,
} as const

export type ActivityChartRangeKey = keyof typeof ACTIVITY_CHART_RANGES

export type ActivityChartPoint = {
  day: string
  commits: number
  pullRequests: number
  issues: number
}

function windowStartForRange(rangeDays: number, today = new Date()): string {
  const d = new Date(today)
  d.setUTCDate(d.getUTCDate() - rangeDays)
  return d.toISOString().slice(0, 10)
}

function addUtcCalendarDays(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function sliceActivityDays(
  rows: ActivityDayRow[],
  rangeDays: number,
  now = new Date(),
): ActivityDayRow[] {
  const start = windowStartForRange(rangeDays, now)
  return rows.filter((row) => row.day >= start)
}

export function fillActivityChartSeries(
  rows: ActivityDayRow[],
  rangeDays: number,
  now = new Date(),
): ActivityChartPoint[] {
  const start = windowStartForRange(rangeDays, now)
  const end = now.toISOString().slice(0, 10)
  const byDay = new Map(
    rows.map((row) => [
      row.day,
      {
        day: row.day,
        commits: row.commits,
        pullRequests: row.pullRequests,
        issues: row.issues,
      },
    ]),
  )

  const points: ActivityChartPoint[] = []
  let cursor = start
  while (cursor <= end) {
    points.push(
      byDay.get(cursor) ?? {
        day: cursor,
        commits: 0,
        pullRequests: 0,
        issues: 0,
      },
    )
    cursor = addUtcCalendarDays(cursor, 1)
  }
  return points
}

export function isActivityRangeEmpty(points: ActivityChartPoint[]): boolean {
  return points.every(
    (point) => point.commits + point.pullRequests + point.issues === 0,
  )
}

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
