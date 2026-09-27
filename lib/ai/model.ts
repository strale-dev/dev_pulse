export const DEFAULT_INSIGHTS_MODEL = 'gpt-4o-mini'

export function resolveInsightsModel(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) return DEFAULT_INSIGHTS_MODEL
  return trimmed
}
