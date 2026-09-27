import { cn } from '@/lib/utils'

type EmptyStateProps = {
  title: string
  description?: string
  className?: string
}

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center',
        className,
      )}
    >
      <p className="font-heading text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-xs/relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
