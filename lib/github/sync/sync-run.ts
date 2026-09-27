import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { syncRuns } from '@/lib/db/schema'

export type SyncStepName =
  | 'profile'
  | 'repos'
  | 'languages'
  | 'contribution_calendar'
  | 'events'
  | 'persist'
  | 'analytics_snapshot'

export type SyncStepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

export type SyncStepRecord = {
  name: SyncStepName
  status: SyncStepStatus
  ms?: number
  error?: string
}

export type SyncKind = 'full' | 'partial' | 'manual'
export type SyncRunStatus = 'running' | 'success' | 'failed' | 'partial'

export function initialSteps(): SyncStepRecord[] {
  return [
    { name: 'profile', status: 'pending' },
    { name: 'repos', status: 'pending' },
    { name: 'languages', status: 'pending' },
    { name: 'contribution_calendar', status: 'pending' },
    { name: 'events', status: 'pending' },
    { name: 'persist', status: 'pending' },
    { name: 'analytics_snapshot', status: 'pending' },
  ]
}

export async function createSyncRun(userId: string, kind: SyncKind): Promise<string> {
  const inserted = await db
    .insert(syncRuns)
    .values({
      userId,
      kind,
      status: 'running',
      steps: initialSteps(),
    })
    .returning({ id: syncRuns.id })

  const id = inserted[0]?.id
  if (!id) throw new Error('Failed to create sync run.')
  return id
}

export async function updateSyncRun(input: {
  syncRunId: string
  steps: SyncStepRecord[]
  status?: SyncRunStatus
  finishedAt?: Date
  githubRateRemaining?: number | null
  githubRateReset?: Date | null
  errorMessage?: string | null
}) {
  await db
    .update(syncRuns)
    .set({
      steps: input.steps,
      status: input.status,
      finishedAt: input.finishedAt,
      githubRateRemaining: input.githubRateRemaining ?? undefined,
      githubRateReset: input.githubRateReset ?? undefined,
      errorMessage: input.errorMessage ?? undefined,
    })
    .where(eq(syncRuns.id, input.syncRunId))
}

export function setStepRunning(steps: SyncStepRecord[], name: SyncStepName): SyncStepRecord[] {
  return steps.map((step) =>
    step.name === name ? { ...step, status: 'running', error: undefined } : step,
  )
}

export function setStepSuccess(
  steps: SyncStepRecord[],
  name: SyncStepName,
  ms: number,
): SyncStepRecord[] {
  return steps.map((step) =>
    step.name === name ? { ...step, status: 'success', ms, error: undefined } : step,
  )
}

export function setStepSkipped(steps: SyncStepRecord[], name: SyncStepName): SyncStepRecord[] {
  return steps.map((step) =>
    step.name === name ? { ...step, status: 'skipped', ms: 0 } : step,
  )
}

export function setStepFailed(
  steps: SyncStepRecord[],
  name: SyncStepName,
  ms: number,
  error: string,
): SyncStepRecord[] {
  return steps.map((step) =>
    step.name === name ? { ...step, status: 'failed', ms, error } : step,
  )
}

export function hasSkippedSteps(steps: SyncStepRecord[]): boolean {
  return steps.some((step) => step.status === 'skipped')
}
