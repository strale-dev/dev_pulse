import { describe, expect, it } from 'vitest'

import { buildTopRepositoriesByStars, computeMostActiveRepo } from '@/lib/analytics/top-repo'

describe('buildTopRepositoriesByStars', () => {
  const repos = [
    { id: BigInt(2), name: 'quiet', stargazersCount: 1 },
    { id: BigInt(1), name: 'popular', stargazersCount: 20 },
  ]

  it('sorts by stars and leaves 90d commits null when that input is omitted', () => {
    const rows = buildTopRepositoriesByStars(repos)
    expect(rows.map((row) => row.name)).toEqual(['popular', 'quiet'])
    expect(rows[0]?.commitsLast90d).toBeNull()
  })

  it('fills 90d commits, including honest zeros, when the 90d list is present', () => {
    const rows = buildTopRepositoriesByStars(repos, [
      { id: BigInt(1), name: 'popular', commits: 4 },
    ])
    expect(rows[0]).toMatchObject({ name: 'popular', commitsLast90d: 4 })
    expect(rows[1]).toMatchObject({ name: 'quiet', commitsLast90d: 0 })
  })

  it('matches 90d counts by name when ids differ', () => {
    const rows = buildTopRepositoriesByStars(repos, [
      { id: BigInt(99), name: 'popular', commits: 7 },
    ])
    expect(rows[0]?.commitsLast90d).toBe(7)
  })
})

describe('computeMostActiveRepo', () => {
  it('returns the repo with the most 90d commits', () => {
    expect(
      computeMostActiveRepo([
        { id: BigInt(1), name: 'a', commits: 3 },
        { id: BigInt(2), name: 'b', commits: 12 },
      ]),
    ).toEqual({
      status: 'ok',
      value: { id: BigInt(2), name: 'b', commits: 12 },
    })
  })

  it('returns insufficient_data for empty input or fewer than 10 commits', () => {
    expect(computeMostActiveRepo([])).toEqual({ status: 'insufficient_data' })
    expect(computeMostActiveRepo([{ id: BigInt(1), name: 'a', commits: 9 }])).toEqual({
      status: 'insufficient_data',
    })
    expect(computeMostActiveRepo([{ id: BigInt(1), name: 'a', commits: 0 }])).toEqual({
      status: 'insufficient_data',
    })
  })
})
