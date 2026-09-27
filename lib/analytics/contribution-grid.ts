/**
 * GitHub-style contribution calendar grid (Sunday-aligned weeks, UTC days).
 */

export type ContributionGridCell = {
  day: string
  contributions: number
  level: number
}

function parseUtcDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`)
}

function formatUtcDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(day: string, delta: number): string {
  const d = parseUtcDay(day)
  d.setUTCDate(d.getUTCDate() + delta)
  return formatUtcDay(d)
}

function startOfUtcWeekSunday(day: string): string {
  const d = parseUtcDay(day)
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return formatUtcDay(d)
}

export function sumContributions(days: ContributionGridCell[]): number {
  return days.reduce((sum, day) => sum + day.contributions, 0)
}

export function groupContributionDaysIntoWeeks(
  days: ContributionGridCell[],
): ContributionGridCell[][] {
  if (days.length === 0) {
    return []
  }

  const byDay = new Map(days.map((day) => [day.day, day]))
  const sorted = [...days].sort((a, b) => a.day.localeCompare(b.day))
  const firstDay = sorted[0]!.day
  const lastDay = sorted[sorted.length - 1]!.day
  const weekStart = startOfUtcWeekSunday(firstDay)

  const weeks: ContributionGridCell[][] = []
  let cursor = weekStart

  while (cursor <= lastDay) {
    const week: ContributionGridCell[] = []
    for (let offset = 0; offset < 7; offset += 1) {
      const cellDay = addUtcDays(cursor, offset)
      week.push(
        byDay.get(cellDay) ?? {
          day: cellDay,
          contributions: 0,
          level: 0,
        },
      )
    }
    weeks.push(week)
    cursor = addUtcDays(cursor, 7)
  }

  return weeks
}
