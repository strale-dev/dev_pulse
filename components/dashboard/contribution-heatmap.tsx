import type { ContributionGridCell } from '@/lib/analytics/contribution-grid'
import type { DashboardHeatmapStats } from '@/lib/dashboard/load-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const HEATMAP_LEVEL_BG: Record<number, string> = {
  0: '#161b22',
  1: '#0e4429',
  2: '#006d32',
  3: '#26a641',
  4: '#39d353',
}

type ContributionHeatmapProps = {
  weeks: ContributionGridCell[][]
  stats: DashboardHeatmapStats
}

function formatCellLabel(day: string, contributions: number): string {
  const date = new Date(`${day}T12:00:00.000Z`)
  const formatted = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return `${contributions} contribution${contributions === 1 ? '' : 's'} on ${formatted}`
}

function HeatmapGrid({
  weeks,
  className,
}: {
  weeks: ContributionGridCell[][]
  className?: string
}) {
  if (weeks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Contribution calendar will appear after your next sync.
      </p>
    )
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div
        className="inline-grid gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${weeks.length}, 11px)`,
          gridTemplateRows: 'repeat(7, 11px)',
        }}
        role="img"
        aria-label="Contribution calendar for the last year"
      >
        {weeks.map((week, weekIndex) =>
          week.map((cell, dayIndex) => {
            const level = Math.min(4, Math.max(0, cell.level))
            return (
              <span
                key={`${weekIndex}-${cell.day}`}
                title={formatCellLabel(cell.day, cell.contributions)}
                className="size-[11px] rounded-[2px]"
                style={{
                  gridColumn: weekIndex + 1,
                  gridRow: dayIndex + 1,
                  backgroundColor: HEATMAP_LEVEL_BG[level],
                }}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export function ContributionHeatmap({ weeks, stats }: ContributionHeatmapProps) {
  const compactWeeks = weeks.length > 12 ? weeks.slice(-12) : weeks

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Contributions</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <HeatmapGrid weeks={weeks} className="hidden md:block" />
          <HeatmapGrid weeks={compactWeeks} className="md:hidden" />
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className="size-[11px] rounded-[2px]"
                style={{ backgroundColor: HEATMAP_LEVEL_BG[level] }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
        <aside className="grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5">
          <StatRow
            label="Total contributions (52w)"
            value={stats.totalContributions.toLocaleString()}
          />
          <StatRow
            label="Current streak"
            value={`${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`}
          />
          <StatRow
            label="Longest streak"
            value={`${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`}
          />
          <StatRow label="Most active day" value={stats.mostActiveDay ?? '—'} />
        </aside>
      </CardContent>
    </Card>
  )
}
