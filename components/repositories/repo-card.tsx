import Link from 'next/link'
import { ArrowSquareOutIcon, GitForkIcon, StarIcon } from '@phosphor-icons/react/dist/ssr'

import { RepoCommitCount } from '@/components/repositories/repo-commit-count'
import { RepoLanguageBar } from '@/components/repositories/repo-language-bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { RepositoryListItem } from '@/lib/repositories/types'

type RepoCardProps = {
  repo: RepositoryListItem
}

export function RepoCard({ repo }: RepoCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="gap-2">
        <div className="flex items-start gap-2">
          <CardTitle className="min-w-0 flex-1 text-sm font-semibold leading-snug">
            <Link
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center gap-1.5 hover:text-primary"
            >
              <span className="truncate">{repo.name}</span>
              <ArrowSquareOutIcon className="size-3 shrink-0 text-muted-foreground" />
            </Link>
          </CardTitle>
        </div>
        {repo.description ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">{repo.description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        <RepoLanguageBar segments={repo.languages} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <StarIcon className="size-3" weight="fill" />
            {repo.stargazersCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <GitForkIcon className="size-3" />
            {repo.forksCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <RepoCommitCount commitsLast90d={repo.commitsLast90d} />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
