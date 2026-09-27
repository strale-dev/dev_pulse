import { describe, expect, it } from 'vitest'

import {
  aggregateLanguageBreakdown,
  aggregateLanguagePercentages,
  computeMostUsedLanguage,
} from '@/lib/analytics/language-mix'

describe('computeMostUsedLanguage', () => {
  it('returns the language with the highest byte share', () => {
    expect(
      computeMostUsedLanguage([
        { language: 'TypeScript', bytes: BigInt(80) },
        { language: 'CSS', bytes: BigInt(20) },
      ]),
    ).toEqual({
      status: 'ok',
      value: { language: 'TypeScript', percentage: 80 },
    })
  })

  it('returns insufficient_data when there are no bytes', () => {
    expect(computeMostUsedLanguage([])).toEqual({ status: 'insufficient_data' })
    expect(computeMostUsedLanguage([{ language: 'Go', bytes: BigInt(0) }])).toEqual({
      status: 'insufficient_data',
    })
  })
})

describe('aggregateLanguageBreakdown', () => {
  it('groups languages beyond the limit into Other', () => {
    const breakdown = aggregateLanguageBreakdown(
      [
        { language: 'TypeScript', bytes: BigInt(500) },
        { language: 'JavaScript', bytes: BigInt(300) },
        { language: 'CSS', bytes: BigInt(100) },
        { language: 'HTML', bytes: BigInt(50) },
        { language: 'Go', bytes: BigInt(40) },
        { language: 'Rust', bytes: BigInt(10) },
      ],
      5,
    )
    expect(breakdown.map((entry) => entry.language)).toEqual([
      'TypeScript',
      'JavaScript',
      'CSS',
      'HTML',
      'Go',
      'Other',
    ])
    expect(breakdown.find((entry) => entry.language === 'Other')?.percentage).toBe(1)
  })
})

describe('aggregateLanguagePercentages', () => {
  it('returns an empty list for an empty mix', () => {
    expect(aggregateLanguagePercentages([])).toEqual([])
  })

  it('reports 0% when every language has zero bytes', () => {
    expect(aggregateLanguagePercentages([{ language: 'Go', bytes: BigInt(0) }])).toEqual([
      { language: 'Go', percentage: 0 },
    ])
  })
})
