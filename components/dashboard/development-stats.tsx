'use client'

import type { DashboardDevelopmentStats } from '@/lib/dashboard/build-development-stats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DevelopmentStatsProps = {
  stats: DashboardDevelopmentStats
}

function formatHourLocal(hourUtc: number): string {
  const date = new Date(Date.UTC(2026, 0, 1, hourUtc, 0, 0))
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

function dash(value: string | number | null | undefined, formatter?: (v: string | number) => string) {
  if (value === null || value === undefined) return '—'
  return formatter ? formatter(value) : String(value)
}

export function DevelopmentStats({ stats }: DevelopmentStatsProps) {
  const languageLabel =
    stats.mostUsedLanguage && stats.mostUsedLanguagePct != null
      ? `${stats.mostUsedLanguage} (${stats.mostUsedLanguagePct}%)`
      : null

  const items = [
    { label: 'Total commits', value: dash(stats.totalCommits, (v) => Number(v).toLocaleString()) },
    { label: 'Total pull requests', value: dash(stats.totalPrs, (v) => Number(v).toLocaleString()) },
    { label: 'Total issues', value: dash(stats.totalIssues, (v) => Number(v).toLocaleString()) },
    { label: 'Most active repo (90d)', value: dash(stats.mostActiveRepoName) },
    { label: 'Most used language', value: dash(languageLabel) },
    { label: 'Most active day', value: dash(stats.mostActiveDay) },
    {
      label: 'Most active hour',
      value:
        stats.mostActiveHourUtc === null
          ? '—'
          : formatHourLocal(stats.mostActiveHourUtc),
    },
    {
      label: 'Current streak',
      value:
        stats.currentStreak === 0
          ? '0 days'
          : `${stats.currentStreak} day${stats.currentStreak === 1 ? '' : 's'}`,
    },
    {
      label: 'Longest streak',
      value:
        stats.longestStreak === 0
          ? '0 days'
          : `${stats.longestStreak} day${stats.longestStreak === 1 ? '' : 's'}`,
    },
    {
      label: 'Avg commits per active day',
      value: dash(stats.avgCommitsPerActiveDay, (v) => Number(v).toLocaleString()),
    },
  ] as const

  return (
    <Card>
      <CardHeader>
        <CardTitle>Development statistics</CardTitle>
        <p className="text-xs text-muted-foreground">
          Derived from your synced GitHub activity. Unreliable metrics are omitted (—).
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <StatItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
