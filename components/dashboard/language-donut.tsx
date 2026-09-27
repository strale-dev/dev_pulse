'use client'

import { Cell, Pie, PieChart } from 'recharts'

import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { DashboardLanguageSegment } from '@/lib/dashboard/load-dashboard'

type LanguageDonutProps = {
  segments: DashboardLanguageSegment[]
}

export function LanguageDonut({ segments }: LanguageDonutProps) {
  if (segments.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Languages</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No language data yet"
            description="Language breakdown appears after your public repositories are synced."
          />
        </CardContent>
      </Card>
    )
  }

  const chartConfig = segments.reduce<ChartConfig>((config, segment) => {
    config[segment.language] = {
      label: segment.language,
      color: segment.color,
    }
    return config
  }, {})

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Languages</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 md:flex-row md:items-center">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[220px] w-full max-w-[220px]">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <span className="font-medium">
                      {name}: {value}%
                    </span>
                  )}
                />
              }
            />
            <Pie
              data={segments}
              dataKey="percentage"
              nameKey="language"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={1}
              strokeWidth={2}
              stroke="var(--card)"
            >
              {segments.map((segment) => (
                <Cell key={segment.language} fill={segment.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="flex min-w-0 flex-1 flex-col gap-2">
          {segments.map((segment) => (
            <li
              key={segment.language}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="truncate font-medium text-foreground">{segment.language}</span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {segment.percentage}%
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
