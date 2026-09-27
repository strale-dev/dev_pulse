'use client'

import { useMemo, useState } from 'react'

import { RepoCard } from '@/components/repositories/repo-card'
import { RepoFilters } from '@/components/repositories/repo-filters'
import {
  filterRepositoriesByQuery,
  sortRepositories,
  type RepositorySortKey,
} from '@/lib/repositories/client-utils'
import type { RepositoryListItem } from '@/lib/repositories/types'

type RepoListProps = {
  repos: RepositoryListItem[]
}

export function RepoList({ repos }: RepoListProps) {
  const [sort, setSort] = useState<RepositorySortKey>('most_stars')
  const [query, setQuery] = useState('')

  const visibleRepos = useMemo(() => {
    const filtered = filterRepositoriesByQuery(repos, query)
    return sortRepositories(filtered, sort)
  }, [repos, query, sort])

  return (
    <div className="flex flex-col gap-6">
      <RepoFilters
        sort={sort}
        query={query}
        onSortChange={setSort}
        onQueryChange={setQuery}
      />

      {visibleRepos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-xs text-muted-foreground">
          No repositories match your search.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visibleRepos.map((repo) => (
            <li key={repo.id}>
              <RepoCard repo={repo} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
