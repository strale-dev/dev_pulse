'use server'

import 'server-only'

import { desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { db } from '@/lib/db'
import { profiles, syncRuns } from '@/lib/db/schema'
import { runSyncPipeline } from '@/lib/github/sync/run-sync'
import type { SyncStepRecord } from '@/lib/github/sync/sync-run'
import { createClient } from '@/lib/server'

async function requireUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  return user.id
}

export async function getLatestSyncRunSteps(): Promise<{
  steps: SyncStepRecord[]
  status: string | null
} | null> {
  const userId = await requireUserId()

  const rows = await db
    .select({
      steps: syncRuns.steps,
      status: syncRuns.status,
    })
    .from(syncRuns)
    .where(eq(syncRuns.userId, userId))
    .orderBy(desc(syncRuns.startedAt))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    steps: row.steps as SyncStepRecord[],
    status: row.status,
  }
}

export async function runFullSync(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId()

  try {
    await runSyncPipeline({ userId, kind: 'full' })
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Sync failed. Please try again.'
    return { ok: false, error: message }
  }
}

export async function runManualRefresh(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId()

  try {
    await runSyncPipeline({ userId, kind: 'manual' })
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Refresh failed. Please try again.'
    return { ok: false, error: message }
  }
}

export async function runPartialSync(): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId()

  try {
    await runSyncPipeline({ userId, kind: 'partial' })
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Sync failed. Please try again.'
    return { ok: false, error: message }
  }
}

export async function getOnboardingStatus(): Promise<{
  completed: boolean
}> {
  const userId = await requireUserId()

  const rows = await db
    .select({ onboardingCompletedAt: profiles.onboardingCompletedAt })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)

  return { completed: Boolean(rows[0]?.onboardingCompletedAt) }
}
