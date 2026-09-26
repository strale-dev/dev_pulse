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

  it('continues a streak across the year boundary (30–31 Dec → 1–2 Jan)', () => {
    const now = new Date('2026-01-02T12:00:00.000Z')
    const result = computeStreaks(
      [
        { day: '2025-12-30', contributions: 1 },
        { day: '2025-12-31', contributions: 1 },
        { day: '2026-01-01', contributions: 1 },
        { day: '2026-01-02', contributions: 1 },
      ],
      now,
    )

    expect(result).toEqual({ currentStreak: 4, longestStreak: 4 })
  })

  it('anchors current streak on the UTC day, not a +14 timezone local date', () => {
    const now = new Date('2026-01-01T00:30:00+14:00')
    expect(now.toISOString().startsWith('2025-12-31')).toBe(true)

    const result = computeStreaks(
      [
        { day: '2025-12-30', contributions: 1 },
        { day: '2025-12-31', contributions: 2 },
      ],
      now,
    )

    expect(result.currentStreak).toBe(2)
    expect(result.longestStreak).toBe(2)
  })

  it('anchors current streak on UTC today when local calendar is already the next day (+09)', () => {
    // Local: 2026-01-02 03:00 in Tokyo — UTC calendar day is still 2026-01-01.
    const now = new Date('2026-01-02T03:00:00+09:00')
    expect(now.toISOString()).toBe('2026-01-01T18:00:00.000Z')

    const result = computeStreaks(
      [
        { day: '2025-12-31', contributions: 1 },
        { day: '2026-01-01', contributions: 2 },
        { day: '2026-01-02', contributions: 99 },
      ],
      now,
    )

    // "Today" for streaks is 2026-01-01 UTC — not local Jan 2; Jan 2 activity is not part of current run.
    expect(result.currentStreak).toBe(2)
    expect(result.longestStreak).toBe(3)
  })

  it('anchors current streak on UTC today when local calendar is still the previous day (US −05)', () => {
    // Local: 2025-12-31 20:00 in US Eastern — UTC calendar day is already 2026-01-01.
    const now = new Date('2025-12-31T20:00:00-05:00')
    expect(now.toISOString()).toBe('2026-01-01T01:00:00.000Z')

    const result = computeStreaks(
      [
        { day: '2025-12-31', contributions: 1 },
        { day: '2026-01-01', contributions: 2 },
      ],
      now,
    )

    expect(result).toEqual({ currentStreak: 2, longestStreak: 2 })
  })

  it('continues a streak across a leap-day', () => {
    const now = new Date('2024-03-01T12:00:00.000Z')
    const result = computeStreaks(
      [
        { day: '2024-02-28', contributions: 1 },
        { day: '2024-02-29', contributions: 1 },
        { day: '2024-03-01', contributions: 1 },
      ],
      now,
    )
    expect(result).toEqual({ currentStreak: 3, longestStreak: 3 })
  })
})
