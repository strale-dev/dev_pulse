/**
 * Phase 5 — Analytics engine (starting point).
 * Pure streak helpers; expand edge cases + timezone coverage in Phase 5 Vitest suite.
 */

export type ContributionDayLike = {
  day: string
  contributions: number
}

function parseDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`)
}

function addUtcDays(day: string, delta: number): string {
  const d = parseDay(day)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

export function computeStreaks(days: ContributionDayLike[]): {
  currentStreak: number
  longestStreak: number
} {
  const activeDays = [...days]
    .filter((d) => d.contributions > 0)
    .map((d) => d.day)
    .sort()

  if (activeDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0 }
  }

  let longest = 1
  let run = 1

  for (let i = 1; i < activeDays.length; i += 1) {
    const prev = activeDays[i - 1]
    const curr = activeDays[i]
    if (!prev || !curr) continue
    const expected = addUtcDays(prev, 1)
    if (curr === expected) {
      run += 1
      longest = Math.max(longest, run)
    } else {
      run = 1
    }
  }

  const activeSet = new Set(activeDays)
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = addUtcDays(today, -1)

  let anchor: string | null = null
  if (activeSet.has(today)) {
    anchor = today
  } else if (activeSet.has(yesterday)) {
    anchor = yesterday
  }

  let current = 0
  if (anchor) {
    let cursor: string = anchor
    while (activeSet.has(cursor)) {
      current += 1
      cursor = addUtcDays(cursor, -1)
    }
  }

  return { currentStreak: current, longestStreak: longest }
}

/** Test helper: UTC date string offset from today. */
export function utcDayOffsetFromToday(offsetDays: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
