import { describe, expect, it } from 'vitest'

import { aggregateLanguagePercentages, computeMostUsedLanguage } from '@/lib/analytics/language-mix'

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
