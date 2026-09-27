'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const SYNC_TOOLTIP = 'Run a sync to see commit counts'

type RepoCommitCountProps = {
  commitsLast90d: number | null
}

export function RepoCommitCount({ commitsLast90d }: RepoCommitCountProps) {
  if (commitsLast90d === null) {
    return (
      <Tooltip>
        <TooltipTrigger
          className="cursor-default border-b border-dotted border-muted-foreground/50 tabular-nums"
          aria-label={SYNC_TOOLTIP}
        >
          —
        </TooltipTrigger>
        <TooltipContent>{SYNC_TOOLTIP}</TooltipContent>
      </Tooltip>
    )
  }

  return <span className="tabular-nums">{commitsLast90d.toLocaleString()} commits (90d)</span>
}
