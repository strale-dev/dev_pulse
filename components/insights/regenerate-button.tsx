'use client'

import { ArrowsClockwiseIcon } from '@phosphor-icons/react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RegenerateButtonProps = {
  disabled: boolean
  pending: boolean
  onRegenerate: () => void
}

export function RegenerateButton({ disabled, pending, onRegenerate }: RegenerateButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      aria-busy={pending}
      onClick={onRegenerate}
    >
      <ArrowsClockwiseIcon className={cn('size-3.5', pending && 'animate-spin')} />
      {pending ? 'Generating…' : 'Regenerate'}
    </Button>
  )
}
