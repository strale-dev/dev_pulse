import Link from 'next/link'
import { ArrowSquareOutIcon, StarIcon } from '@phosphor-icons/react/dist/ssr'

import type { DashboardTopRepo } from '@/lib/dashboard/load-dashboard'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
type TopReposPreviewProps = {
  repos: DashboardTopRepo[]
}

export function TopReposPreview({ repos }: TopReposPreviewProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top repositories</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        {repos.length === 0 ? (
          <EmptyState
            title="No public repositories"
            description="Create a public GitHub repository to see it here after sync."
          />
        ) : (
          <ul className="divide-y divide-border">
            {repos.map((repo) => (
              <li key={repo.id}>
                <div className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-medium text-foreground hover:text-primary"
                      >
                        {repo.name}
                      </Link>
                      <ArrowSquareOutIcon className="size-3 shrink-0 text-muted-foreground" />
                    </div>
                    {repo.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {repo.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {repo.primaryLanguage ? <span>{repo.primaryLanguage}</span> : null}
                      <span className="inline-flex items-center gap-1">
                        <StarIcon className="size-3" weight="fill" />
                        {repo.stargazersCount.toLocaleString()}
                      </span>
                      {repo.commitsLast90d !== null ? (
                        <span>{repo.commitsLast90d} commits (90d)</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
