import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PublicProfileShellProps = {
  signedIn: boolean
  children: React.ReactNode
}

export function PublicProfileShell({ signedIn, children }: PublicProfileShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 md:px-6">
        <Link
          href={signedIn ? '/dashboard' : '/'}
          className="font-heading text-sm font-semibold tracking-wide text-primary"
        >
          DevPulse
        </Link>
        <Link
          href={signedIn ? '/dashboard' : '/auth/login'}
          className={cn(buttonVariants({ size: 'sm', variant: signedIn ? 'outline' : 'default' }))}
        >
          {signedIn ? 'Dashboard' : 'Sign in'}
        </Link>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
    </div>
  )
}
