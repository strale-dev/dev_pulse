import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function RepoCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  )
}

export function RepositoriesPageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6"
      aria-busy="true"
      aria-label="Loading repositories"
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-3 w-72" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Skeleton className="h-7 w-full sm:max-w-sm" />
        <Skeleton className="h-7 w-52" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <RepoCardSkeleton key={index} />
        ))}
      </div>
    </div>
  )
}
