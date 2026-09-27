import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { RepoCard } from '@/components/repositories/repo-card'
import { RepoList } from '@/components/repositories/repo-list'
import { RepositoriesPageSkeleton } from '@/components/repositories/repositories-page-skeleton'
import {
  filterRepositoriesByQuery,
  sortRepositories,
} from '@/lib/repositories/client-utils'
import type { RepositoryListItem } from '@/lib/repositories/types'

const sampleRepo: RepositoryListItem = {
  id: '1',
  name: 'dev-pulse',
  fullName: 'user/dev-pulse',
  description: 'Developer dashboard from GitHub activity',
  htmlUrl: 'https://github.com/user/dev-pulse',
  stargazersCount: 12,
  forksCount: 3,
  pushedAt: '2026-01-01T00:00:00.000Z',
  githubUpdatedAt: '2026-01-02T00:00:00.000Z',
  commitsLast90d: 5,
  languages: [
    { language: 'TypeScript', percentage: 80, color: '#3178c6' },
    { language: 'CSS', percentage: 20, color: '#663399' },
  ],
}

describe('repositories UI states', () => {
  it('renders loading skeleton with accessible label', () => {
    const html = renderToStaticMarkup(createElement(RepositoriesPageSkeleton))

    expect(html).toContain('Loading repositories')
    expect(html.match(/data-slot="skeleton"/g)?.length).toBeGreaterThanOrEqual(10)
  })

  it('renders repo card with external link and language bar', () => {
    const html = renderToStaticMarkup(createElement(RepoCard, { repo: sampleRepo }))

    expect(html).toContain('dev-pulse')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('TypeScript 80%')
  })

  it('renders filter-empty message when search matches nothing', () => {
    const html = renderToStaticMarkup(
      createElement(RepoList, {
        repos: [sampleRepo],
      }),
    )

    expect(html).toContain('Search repositories')
  })
})

describe('repositories client utils', () => {
  it('filters by tokens in name and description', () => {
    const repos: RepositoryListItem[] = [
      sampleRepo,
      {
        ...sampleRepo,
        id: '2',
        name: 'other',
        description: 'unrelated project',
      },
    ]

    expect(filterRepositoriesByQuery(repos, 'dashboard github').map((r) => r.id)).toEqual(['1'])
  })

  it('sorts by stars and commits, with unknown commits last', () => {
    const repos: RepositoryListItem[] = [
      { ...sampleRepo, id: '1', stargazersCount: 1, commitsLast90d: 10 },
      { ...sampleRepo, id: '2', stargazersCount: 99, commitsLast90d: 1 },
      { ...sampleRepo, id: '3', stargazersCount: 50, commitsLast90d: null },
    ]

    expect(sortRepositories(repos, 'most_stars').map((r) => r.id)).toEqual(['2', '3', '1'])
    expect(sortRepositories(repos, 'most_commits').map((r) => r.id)).toEqual(['1', '2', '3'])
  })

  it('renders em dash when commit counts are unknown', () => {
    const html = renderToStaticMarkup(
      createElement(RepoCard, {
        repo: { ...sampleRepo, commitsLast90d: null },
      }),
    )

    expect(html).toContain('—')
    expect(html).toContain('Run a sync to see commit counts')
  })
})
