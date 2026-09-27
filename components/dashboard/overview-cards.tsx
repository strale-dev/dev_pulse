import type { DashboardOverview } from '@/lib/dashboard/load-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type OverviewCardsProps = {
  overview: DashboardOverview
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '—'
  if (delta === 0) return '0'
  return delta > 0 ? `+${delta}` : `${delta}`
}

function DeltaBadge({
  delta,
  tooltip,
}: {
  delta: number | null
  tooltip: string
}) {
  const label = formatDelta(delta)
  const tone =
    delta === null
      ? 'text-muted-foreground'
      : delta > 0
        ? 'text-emerald-400'
        : delta < 0
          ? 'text-amber-400'
          : 'text-muted-foreground'

  return (
    <Tooltip>
      <TooltipTrigger className={cn('text-xs tabular-nums', tone)}>{label}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

const DELTA_TOOLTIP = 'Compared to the previous 30 days'
const REPOS_DELTA_TOOLTIP = 'Compared to your previous analytics snapshot'

export function OverviewCards({ overview }: OverviewCardsProps) {
  const cards = [
    {
      title: 'Repositories',
      value: overview.totalRepos,
      delta: overview.deltas.repos,
      deltaTooltip: REPOS_DELTA_TOOLTIP,
    },
    {
      title: 'Total commits',
      value: overview.totalCommits,
      delta: overview.deltas.commits,
      deltaTooltip: DELTA_TOOLTIP,
    },
    {
      title: 'Total PRs',
      value: overview.totalPrs,
      delta: overview.deltas.pullRequests,
      deltaTooltip: DELTA_TOOLTIP,
    },
    {
      title: 'Total issues',
      value: overview.totalIssues,
      delta: overview.deltas.issues,
      deltaTooltip: DELTA_TOOLTIP,
    },
  ] as const

  return (
    <TooltipProvider delay={200}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} size="sm">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <DeltaBadge delta={card.delta} tooltip={card.deltaTooltip} />
            </CardHeader>
            <CardContent>
              <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">
                {card.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </TooltipProvider>
  )
}
