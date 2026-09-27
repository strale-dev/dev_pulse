import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function InsightsPageSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6"
      aria-busy="true"
      aria-label="Loading insights"
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <InsightsPanelSkeleton />
    </div>
  )
}

export function InsightsPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-44" />
        <Skeleton className="mt-2 h-3 w-full max-w-md" />
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
