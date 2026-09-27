import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
      aria-busy="true"
      aria-label="Loading settings"
    >
      <div className="space-y-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-3 w-56" />
      </div>
      {Array.from({ length: 2 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
