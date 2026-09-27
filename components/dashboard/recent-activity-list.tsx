import type { DashboardRecentDay } from '@/lib/dashboard/load-dashboard'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatDay(day: string): string {
  const date = new Date(`${day}T12:00:00.000Z`)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

type RecentActivityListProps = {
  days: DashboardRecentDay[]
}

export function RecentActivityList({ days }: RecentActivityListProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <EmptyState
            title="No recent activity"
            description="Commits, pull requests, and issues from the last sync will show up here."
          />
        ) : (
          <ul className="space-y-3">
            {days.map((day) => (
              <li
                key={day.day}
                className="flex items-center justify-between gap-4 text-xs"
              >
                <span className="font-medium text-foreground">{formatDay(day.day)}</span>
                <div className="flex shrink-0 gap-3 tabular-nums text-muted-foreground">
                  <span>{day.commits} commits</span>
                  <span>{day.pullRequests} PRs</span>
                  <span>{day.issues} issues</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
