import type { RepositoryLanguageSegment } from '@/lib/repositories/types'
import { cn } from '@/lib/utils'

type RepoLanguageBarProps = {
  segments: RepositoryLanguageSegment[]
  className?: string
}

export function RepoLanguageBar({ segments, className }: RepoLanguageBarProps) {
  if (segments.length === 0) {
    return null
  }

  return (
    <div
      className={cn('flex h-2 w-full overflow-hidden rounded-full bg-muted', className)}
      role="img"
      aria-label={segments
        .map((segment) => `${segment.language} ${segment.percentage}%`)
        .join(', ')}
    >
      {segments.map((segment) => (
        <span
          key={segment.language}
          className="h-full min-w-0 shrink-0"
          style={{
            width: `${segment.percentage}%`,
            backgroundColor: segment.color,
          }}
          title={`${segment.language} ${segment.percentage}%`}
        />
      ))}
    </div>
  )
}
