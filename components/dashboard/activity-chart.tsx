'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { FadeSlideSwap } from '@/components/shared/fade-in'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ACTIVITY_CHART_RANGES,
  fillActivityChartSeries,
  isActivityRangeEmpty,
  type ActivityChartRangeKey,
} from '@/lib/analytics/activity-timeseries'
import type { DashboardRecentDay } from '@/lib/dashboard/load-dashboard'
import { cn } from '@/lib/utils'

const chartConfig = {
  commits: {
    label: 'Commits',
    color: 'var(--chart-1)',
  },
  pullRequests: {
    label: 'Pull requests',
    color: 'var(--chart-2)',
  },
  issues: {
    label: 'Issues',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig

type ActivityChartProps = {
  days: DashboardRecentDay[]
}

function formatAxisDay(day: string): string {
  const date = new Date(`${day}T12:00:00.000Z`)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function ActivityChart({ days }: ActivityChartProps) {
  const [range, setRange] = React.useState<ActivityChartRangeKey>('7D')
  const rangeDays = ACTIVITY_CHART_RANGES[range]
  const series = React.useMemo(
    () => fillActivityChartSeries(days, rangeDays),
    [days, rangeDays],
  )
  const empty = isActivityRangeEmpty(series)

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Activity</CardTitle>
        <Tabs
          value={range}
          onValueChange={(value) => setRange(value as ActivityChartRangeKey)}
        >
          <TabsList variant="default" className="h-8">
            {(Object.keys(ACTIVITY_CHART_RANGES) as ActivityChartRangeKey[]).map((key) => (
              <TabsTrigger key={key} value={key} className="px-2.5 text-xs">
                {key}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState title="Not enough activity in this range." />
        ) : (
          <FadeSlideSwap swapKey={range} className="overflow-x-auto">
            <ChartContainer
              config={chartConfig}
              className={cn(
                'aspect-auto h-[280px] w-full',
                rangeDays > 90 && 'min-w-[640px]',
              )}
            >
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={rangeDays > 90 ? 48 : 24}
                  tickFormatter={formatAxisDay}
                />
                <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const day = payload?.[0]?.payload?.day as string | undefined
                        return day ? formatAxisDay(day) : ''
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="commits"
                  stackId="activity"
                  stroke="var(--color-commits)"
                  fill="var(--color-commits)"
                  fillOpacity={0.35}
                />
                <Area
                  type="monotone"
                  dataKey="pullRequests"
                  stackId="activity"
                  stroke="var(--color-pullRequests)"
                  fill="var(--color-pullRequests)"
                  fillOpacity={0.35}
                />
                <Area
                  type="monotone"
                  dataKey="issues"
                  stackId="activity"
                  stroke="var(--color-issues)"
                  fill="var(--color-issues)"
                  fillOpacity={0.35}
                />
              </AreaChart>
            </ChartContainer>
          </FadeSlideSwap>
        )}
      </CardContent>
    </Card>
  )
}
