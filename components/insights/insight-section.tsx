'use client'

import { experimental_useObject as useObject } from '@ai-sdk/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { RegenerateButton } from '@/components/insights/regenerate-button'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { isRegenerateCoolingDown, REGENERATE_COOLDOWN_MS } from '@/lib/ai/cache-policy'
import { INSIGHTS_FAILURE_MESSAGE } from '@/lib/ai/messages'
import { insightsSchema, type Insights } from '@/lib/ai/schema'

const autostartedSnapshots = new Set<string>()

export type InsightSectionProps = {
  hasSnapshot: boolean
  snapshotHash: string | null
  initial: Insights | null
  generatedAt: string | null
}

function InsightBlock({
  title,
  text,
  pending,
}: {
  title: string
  text?: string
  pending: boolean
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      {text ? (
        <p className="mt-2 text-sm/relaxed text-foreground">{text}</p>
      ) : pending ? (
        <div className="mt-2 space-y-2" aria-hidden="true">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ) : null}
    </div>
  )
}

export function InsightSection({
  hasSnapshot,
  snapshotHash,
  initial,
  generatedAt: initialGeneratedAt,
}: InsightSectionProps) {
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt)
  const [now, setNow] = useState(() => Date.now())
  const failed = useRef(false)

  const { object, submit, isLoading, error } = useObject({
    api: '/api/insights',
    schema: insightsSchema,
    id: snapshotHash ? `insights-${snapshotHash}` : 'insights',
    initialValue: initial ?? undefined,
    credentials: 'include',
    onError: () => {
      if (failed.current) return
      failed.current = true
      toast.error(INSIGHTS_FAILURE_MESSAGE)
    },
    onFinish: ({ object: finished, error: finishError }) => {
      if (finishError || !finished) {
        if (failed.current) return
        failed.current = true
        toast.error(INSIGHTS_FAILURE_MESSAGE)
        return
      }
      setGeneratedAt(new Date().toISOString())
    },
  })

  useEffect(() => {
    setGeneratedAt(initialGeneratedAt)
  }, [initialGeneratedAt])

  useEffect(() => {
    if (!hasSnapshot || initial || !snapshotHash) return
    if (autostartedSnapshots.has(snapshotHash)) return
    autostartedSnapshots.add(snapshotHash)
    failed.current = false
    submit({ regenerate: false })
  }, [hasSnapshot, initial, snapshotHash, submit])

  const generatedMs = generatedAt ? new Date(generatedAt).getTime() : null
  const coolingDown =
    generatedMs != null && isRegenerateCoolingDown(new Date(generatedMs), new Date(now))

  useEffect(() => {
    if (!coolingDown || generatedMs == null) return
    const remaining = REGENERATE_COOLDOWN_MS - (Date.now() - generatedMs)
    const id = window.setTimeout(() => setNow(Date.now()), Math.max(remaining, 0) + 20)
    return () => window.clearTimeout(id)
  }, [coolingDown, generatedMs])

  const visible = object ?? initial ?? undefined
  const recommendations = (visible?.recommendations ?? []).filter(
    (item): item is string => typeof item === 'string' && item.length > 0,
  )
  const showFailure = Boolean(error) && !visible?.developmentStyle
  const waitingForFirstInsight = hasSnapshot && !error && !visible?.developmentStyle

  return (
    <Card aria-busy={isLoading}>
      <CardHeader>
        <CardTitle>AI Developer Insights</CardTitle>
        <CardDescription>
          Written from your latest analytics snapshot. Cached for 24 hours.
        </CardDescription>
        <CardAction>
          <RegenerateButton
            pending={isLoading}
            disabled={!hasSnapshot || isLoading || coolingDown}
            onRegenerate={() => {
              failed.current = false
              submit({ regenerate: true })
            }}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {!hasSnapshot ? (
          <EmptyState
            title="Not enough GitHub activity to generate insights yet."
            description="Insights are written only after an analytics snapshot exists."
          />
        ) : showFailure ? (
          <p className="text-sm/relaxed text-muted-foreground">{INSIGHTS_FAILURE_MESSAGE}</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <InsightBlock
              title="Development style"
              text={visible?.developmentStyle}
              pending={isLoading || waitingForFirstInsight}
            />
            <InsightBlock
              title="Technology"
              text={visible?.technology}
              pending={isLoading || waitingForFirstInsight}
            />
            <InsightBlock
              title="Consistency"
              text={visible?.consistency}
              pending={isLoading || waitingForFirstInsight}
            />
            <div className="rounded-lg border border-border/60 bg-card/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Recommendations</p>
              {recommendations.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm/relaxed text-foreground">
                  {recommendations.map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </ul>
              ) : isLoading || waitingForFirstInsight ? (
                <div className="mt-2 space-y-2" aria-hidden="true">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
