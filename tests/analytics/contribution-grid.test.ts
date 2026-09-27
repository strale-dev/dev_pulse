import { describe, expect, it } from 'vitest'

import {
  groupContributionDaysIntoWeeks,
  sumContributions,
} from '@/lib/analytics/contribution-grid'

describe('groupContributionDaysIntoWeeks', () => {
  it('aligns the first week to Sunday and pads missing days', () => {
    const weeks = groupContributionDaysIntoWeeks([
      { day: '2026-01-06', contributions: 3, level: 2 },
      { day: '2026-01-08', contributions: 1, level: 1 },
    ])

    expect(weeks).toHaveLength(1)
    expect(weeks[0]!.map((cell) => cell.day)).toEqual([
      '2026-01-04',
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
    ])
    expect(weeks[0]![0]).toEqual({
      day: '2026-01-04',
      contributions: 0,
      level: 0,
    })
  })

  it('returns an empty grid for no days', () => {
    expect(groupContributionDaysIntoWeeks([])).toEqual([])
  })
})

describe('sumContributions', () => {
  it('totals contribution counts', () => {
    expect(
      sumContributions([
        { day: '2026-01-01', contributions: 2, level: 1 },
        { day: '2026-01-02', contributions: 5, level: 2 },
      ]),
    ).toBe(7)
  })
})
