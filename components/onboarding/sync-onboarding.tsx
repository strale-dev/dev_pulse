'use client'

/**
 * TEMPORARY (Phase 4): polls sync_runs and lists step labels.
 * Phase 6 — redesign with shadcn Skeleton/Progress, AppShell, and proper streaming UX.
 */

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import {
  getLatestSyncRunSteps,
  runFullSync,
} from '@/app/(app)/actions/sync'
import type { SyncStepRecord } from '@/lib/github/sync/sync-run'

const STEP_LABELS: Record<SyncStepRecord['name'], string> = {
  profile: 'GitHub profile',
  repos: 'Repositories',
  languages: 'Languages',
  contribution_calendar: 'Contribution calendar',
  events: 'Recent activity',
  persist: 'Saving data',
  analytics_snapshot: 'Analytics snapshot',
}

function statusLabel(status: SyncStepRecord['status']): string {
  switch (status) {
    case 'running':
      return 'In progress…'
    case 'success':
      return 'Done'
    case 'failed':
      return 'Failed'
    case 'skipped':
      return 'Skipped'
    default:
      return 'Pending'
  }
}

export function SyncOnboarding() {
  const router = useRouter()
  const [steps, setSteps] = useState<SyncStepRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    let cancelled = false

    const poll = window.setInterval(async () => {
      const latest = await getLatestSyncRunSteps()
      if (!cancelled && latest?.steps) {
        setSteps(latest.steps)
      }
    }, 700)

    void (async () => {
      const result = await runFullSync()
      if (cancelled) return

      const latest = await getLatestSyncRunSteps()
      if (latest?.steps) setSteps(latest.steps)

      if (result.ok) {
        router.replace('/dashboard')
        router.refresh()
      } else {
        setError(result.error)
        setRunning(false)
      }
    })()

    return () => {
      cancelled = true
      window.clearInterval(poll)
    }
  }, [router])

  const displaySteps =
    steps.length > 0
      ? steps
      : (Object.keys(STEP_LABELS) as SyncStepRecord['name'][]).map((name) => ({
          name,
          status: 'pending' as const,
        }))

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <div className="text-center">
        <p className="font-heading text-sm font-medium tracking-wide text-primary">DevPulse</p>
        <h1 className="font-heading mt-2 text-2xl font-semibold text-foreground">
          Syncing your GitHub data
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {running
            ? 'This runs once after your first sign-in. It may take a minute.'
            : 'Sync stopped.'}
        </p>
      </div>

      <ul className="space-y-2 rounded-lg border border-border bg-card p-4">
        {displaySteps.map((step) => (
          <li
            key={step.name}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-foreground">{STEP_LABELS[step.name]}</span>
            <span className="text-muted-foreground">{statusLabel(step.status)}</span>
          </li>
        ))}
      </ul>

      {error ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
