import { describe, expect, it } from 'vitest'

import {
  computeAvgCommitsPerActiveDay,
  computeMostActiveHourUTC,
  computeMostActiveWeekday,
  fillActivityChartSeries,
  isActivityRangeEmpty,
  sliceActivityDays,
} from '@/lib/analytics/activity-timeseries'

describe('fillActivityChartSeries', () => {
  const now = new Date('2026-04-10T12:00:00.000Z')

  it('zero-fills missing days inside the range', () => {
    const points = fillActivityChartSeries(
      [{ day: '2026-04-08', commits: 2, pullRequests: 1, issues: 0 }],
      7,
      now,
    )
    expect(points[0]).toEqual({
      day: '2026-04-03',
      commits: 0,
      pullRequests: 0,
      issues: 0,
    })
    expect(points.at(-1)?.day).toBe('2026-04-10')
    expect(points.find((p) => p.day === '2026-04-08')).toEqual({
      day: '2026-04-08',
      commits: 2,
      pullRequests: 1,
      issues: 0,
    })
  })

  it('sliceActivityDays filters by inclusive start day', () => {
    const rows = [
      { day: '2026-04-01', commits: 1, pullRequests: 0, issues: 0 },
      { day: '2026-04-09', commits: 2, pullRequests: 0, issues: 0 },
    ]
    expect(sliceActivityDays(rows, 7, now)).toEqual([
      { day: '2026-04-09', commits: 2, pullRequests: 0, issues: 0 },
    ])
  })

  it('isActivityRangeEmpty is true when every day is zero', () => {
    expect(
      isActivityRangeEmpty([
        { day: '2026-04-01', commits: 0, pullRequests: 0, issues: 0 },
      ]),
    ).toBe(true)
    expect(
      isActivityRangeEmpty([
        { day: '2026-04-01', commits: 0, pullRequests: 1, issues: 0 },
      ]),
    ).toBe(false)
  })
})

describe('computeMostActiveWeekday', () => {
  it('uses median, not sum, when they disagree', () => {
    const result = computeMostActiveWeekday([
      { day: '2026-01-05', commits: 20, pullRequests: 0, issues: 0 },
      { day: '2026-01-12', commits: 0, pullRequests: 0, issues: 0 },
      { day: '2026-01-06', commits: 12, pullRequests: 0, issues: 0 },
    ])
    expect(result).toEqual({ status: 'ok', value: 'Tuesday' })
  })

  it('breaks median ties using Sunday–Saturday order', () => {
    const result = computeMostActiveWeekday([
      { day: '2026-01-04', commits: 10, pullRequests: 0, issues: 0 },
      { day: '2026-01-05', commits: 10, pullRequests: 0, issues: 0 },
    ])
    expect(result).toEqual({ status: 'ok', value: 'Sunday' })
  })

  it('returns insufficient_data below 10 commits instead of a weekday zero', () => {
    expect(
      computeMostActiveWeekday([
        { day: '2026-01-05', commits: 9, pullRequests: 0, issues: 0 },
      ]),
    ).toEqual({ status: 'insufficient_data' })
    expect(computeMostActiveWeekday([])).toEqual({ status: 'insufficient_data' })
  })
})

describe('computeMostActiveHourUTC', () => {
  it('picks the UTC hour with the most commits', () => {
    const hours = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 14, 14]
    expect(computeMostActiveHourUTC(hours)).toEqual({ status: 'ok', value: 3 })
  })

  it('breaks ties toward the earlier UTC hour', () => {
    const hours = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]
    expect(computeMostActiveHourUTC(hours)).toEqual({ status: 'ok', value: 5 })
  })

  it('returns insufficient_data for empty or < 10 hour samples', () => {
    expect(computeMostActiveHourUTC([])).toEqual({ status: 'insufficient_data' })
    expect(computeMostActiveHourUTC([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({
      status: 'insufficient_data',
    })
  })

  it('ignores out-of-range hours and can still be insufficient', () => {
    expect(computeMostActiveHourUTC([-1, 24, 99, 30, 40, 50, 60, 70, 80, 90])).toEqual({
      status: 'insufficient_data',
    })
  })

  it('still picks a valid hour when some samples are out of range', () => {
    expect(
      computeMostActiveHourUTC([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 99, -4]),
    ).toEqual({ status: 'ok', value: 9 })
  })
})

describe('computeAvgCommitsPerActiveDay', () => {
  it('divides total commits by days with at least one commit', () => {
    const result = computeAvgCommitsPerActiveDay([
      { day: '2026-01-01', commits: 8, pullRequests: 0, issues: 0 },
      { day: '2026-01-02', commits: 0, pullRequests: 0, issues: 0 },
      { day: '2026-01-03', commits: 4, pullRequests: 0, issues: 0 },
    ])
    expect(result).toEqual({ status: 'ok', value: 6 })
  })

  it('returns insufficient_data for < 10 commits or zero active days', () => {
    expect(
      computeAvgCommitsPerActiveDay([
        { day: '2026-01-01', commits: 9, pullRequests: 0, issues: 0 },
      ]),
    ).toEqual({ status: 'insufficient_data' })
    expect(
      computeAvgCommitsPerActiveDay([
        { day: '2026-01-01', commits: 0, pullRequests: 0, issues: 0 },
      ]),
    ).toEqual({ status: 'insufficient_data' })
    expect(computeAvgCommitsPerActiveDay([])).toEqual({ status: 'insufficient_data' })
  })
})
