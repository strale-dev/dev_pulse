export const INSIGHTS_TTL_MS = 24 * 60 * 60 * 1000
export const REGENERATE_COOLDOWN_MS = 60 * 1000

export function insightExpiresAt(generatedAt: Date): Date {
  return new Date(generatedAt.getTime() + INSIGHTS_TTL_MS)
}

export function isInsightCacheFresh(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() > now.getTime()
}

export function isRegenerateCoolingDown(generatedAt: Date, now = new Date()): boolean {
  return now.getTime() - generatedAt.getTime() < REGENERATE_COOLDOWN_MS
}
