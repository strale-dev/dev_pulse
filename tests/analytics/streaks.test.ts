import { describe, expect, it } from 'vitest'

import { computeStreaks, utcDayOffsetFromToday } from '@/lib/analytics/streaks'

describe('computeStreaks', () => {
  it('returns zero when there are no active days', () => {
    expect(computeStreaks([])).toEqual({ currentStreak: 0, longestStreak: 0 })
    expect(computeStreaks([{ day: '2026-01-01', contributions: 0 }])).toEqual({
      currentStreak: 0,
      longestStreak: 0,
    })
  })

  it('computes longest streak across gaps', () => {
    const days = [
      { day: '2026-01-01', contributions: 2 },
      { day: '2026-01-02', contributions: 1 },
      { day: '2026-01-03', contributions: 4 },
      { day: '2026-01-10', contributions: 1 },
      { day: '2026-01-11', contributions: 1 },
    ]
    expect(computeStreaks(days).longestStreak).toBe(3)
  })

  it('counts current streak from today when active today', () => {
    const today = utcDayOffsetFromToday(0)
    const yesterday = utcDayOffsetFromToday(-1)
    const twoDaysAgo = utcDayOffsetFromToday(-2)

    const result = computeStreaks([
      { day: twoDaysAgo, contributions: 1 },
      { day: yesterday, contributions: 2 },
      { day: today, contributions: 3 },
    ])

    expect(result.currentStreak).toBe(3)
  })

  it('counts current streak from yesterday when inactive today', () => {
    const yesterday = utcDayOffsetFromToday(-1)
    const twoDaysAgo = utcDayOffsetFromToday(-2)

    const result = computeStreaks([
      { day: twoDaysAgo, contributions: 1 },
      { day: yesterday, contributions: 2 },
    ])

    expect(result.currentStreak).toBe(2)
  })
})
