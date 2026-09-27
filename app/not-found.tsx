import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6">
      <p className="font-heading text-sm font-medium tracking-wide text-primary">DevPulse</p>
      <h1 className="mt-4 font-heading text-2xl font-semibold text-foreground">Page not found</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
        This page doesn&apos;t exist, or it isn&apos;t available.
      </p>
      <Link href="/" className={cn(buttonVariants({ size: 'sm' }), 'mt-6')}>
        Back to home
      </Link>
    </div>
  )
}
