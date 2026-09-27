'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircleIcon,
  CircleIcon,
  SpinnerIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'
import { toast } from 'sonner'

import {
  getLatestSyncRunSteps,
  runFullSync,
} from '@/app/(app)/actions/sync'
import type { SyncStepRecord } from '@/lib/github/sync/sync-run'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const STEP_LABELS: Record<SyncStepRecord['name'], string> = {
  profile: 'GitHub profile',
  repos: 'Repositories',
  languages: 'Languages',
  contribution_calendar: 'Contribution calendar',
  events: 'Recent activity',
  persist: 'Saving data',
  analytics_snapshot: 'Analytics snapshot',
}

const STEP_ORDER = Object.keys(STEP_LABELS) as SyncStepRecord['name'][]

function StepIcon({ status }: { status: SyncStepRecord['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircleIcon className="size-4 text-emerald-400" weight="fill" />
    case 'running':
      return <SpinnerIcon className="size-4 animate-spin text-primary" />
    case 'failed':
      return <WarningCircleIcon className="size-4 text-destructive" weight="fill" />
    case 'skipped':
      return <CircleIcon className="size-4 text-muted-foreground" />
    default:
      return <CircleIcon className="size-4 text-muted-foreground/50" />
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
        toast.success('Sync complete — welcome to DevPulse')
        router.replace('/dashboard')
        router.refresh()
      } else {
        setError(result.error)
        setRunning(false)
        toast.error(result.error)
      }
    })()

    return () => {
      cancelled = true
      window.clearInterval(poll)
    }
  }, [router])

  const displaySteps = useMemo(() => {
    if (steps.length > 0) return steps
    return STEP_ORDER.map((name) => ({
      name,
      status: 'pending' as const,
    }))
  }, [steps])

  const completedCount = displaySteps.filter(
    (step) => step.status === 'success' || step.status === 'skipped',
  ).length
  const progressValue = Math.round((completedCount / STEP_ORDER.length) * 100)

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-lg">Syncing your GitHub data</CardTitle>
        <CardDescription>
          {running
            ? 'This runs once after your first sign-in. It may take a minute.'
            : 'Sync stopped. You can sign out and try again after fixing the issue.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={running ? progressValue : progressValue} />
        </div>

        <ul className="space-y-2">
          {displaySteps.map((step) => (
              <li
                key={step.name}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <StepIcon status={step.status} />
                  <span className="truncate text-sm text-foreground">
                    {STEP_LABELS[step.name]}
                  </span>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-xs capitalize text-muted-foreground',
                    step.status === 'failed' && 'text-destructive',
                  )}
                >
                  {step.status === 'running'
                    ? 'In progress'
                    : step.status === 'success'
                      ? 'Done'
                      : step.status}
                </span>
              </li>
          ))}
        </ul>

        {error ? (
          <p className="text-center text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
