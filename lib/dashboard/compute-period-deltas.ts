import type { ActivityDayRow } from '@/lib/analytics/types'
import { windowStartDateFromToday } from '@/lib/analytics/snapshot-pure'

export type PeriodDeltas = {
  commits: number | null
  pullRequests: number | null
  issues: number | null
  repos: number | null
}

function sumField(
  rows: ActivityDayRow[],
  field: keyof Pick<ActivityDayRow, 'commits' | 'pullRequests' | 'issues'>,
  startInclusive: string,
  endExclusive?: string,
): number {
  return rows
    .filter((row) => row.day >= startInclusive && (endExclusive ? row.day < endExclusive : true))
    .reduce((sum, row) => sum + row[field], 0)
}

export function computePeriodDeltas(
  activityRows: ActivityDayRow[],
  currentTotalRepos: number,
  previousTotalRepos: number | null,
  today = new Date(),
): PeriodDeltas {
  const recentStart = windowStartDateFromToday(30, today)
  const previousStart = windowStartDateFromToday(60, today)

  const recentCommits = sumField(activityRows, 'commits', recentStart)
  const previousCommits = sumField(activityRows, 'commits', previousStart, recentStart)

  const recentPrs = sumField(activityRows, 'pullRequests', recentStart)
  const previousPrs = sumField(activityRows, 'pullRequests', previousStart, recentStart)

  const recentIssues = sumField(activityRows, 'issues', recentStart)
  const previousIssues = sumField(activityRows, 'issues', previousStart, recentStart)

  return {
    commits: recentCommits - previousCommits,
    pullRequests: recentPrs - previousPrs,
    issues: recentIssues - previousIssues,
    repos:
      previousTotalRepos === null ? null : currentTotalRepos - previousTotalRepos,
  }
}
