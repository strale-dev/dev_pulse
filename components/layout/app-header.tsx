'use client'

import Link from 'next/link'
import { ListIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'

import { DashboardRefreshButton } from '@/components/dashboard/dashboard-refresh-button'
import { UserMenu } from '@/components/layout/user-menu'
import { Button } from '@/components/ui/button'
import { timeOfDayGreeting } from '@/lib/dashboard/greeting'
import type { ShellUser } from '@/lib/dashboard/load-dashboard'
import { useUiStore } from '@/lib/stores/ui-store'

type AppHeaderProps = {
  user: ShellUser
  showMobileNavTrigger?: boolean
  showRefresh?: boolean
}

export function AppHeader({
  user,
  showMobileNavTrigger = false,
  showRefresh = true,
}: AppHeaderProps) {
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen)
  const setCommandOpen = useUiStore((state) => state.setCommandOpen)
  const greeting = timeOfDayGreeting()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4 xl:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {showMobileNavTrigger ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileNavOpen(true)}
          >
            <ListIcon className="size-4" />
          </Button>
        ) : null}
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold text-foreground">
            {greeting}, {user.displayName}
          </p>
          {user.githubLogin ? (
            <p className="truncate text-xs text-muted-foreground">@{user.githubLogin}</p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden gap-1.5 sm:inline-flex"
          onClick={() => setCommandOpen(true)}
          aria-label="Open command palette"
        >
          <MagnifyingGlassIcon className="size-3.5" />
          <span>Search</span>
          <kbd className="ml-1 rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          aria-label="Open command palette"
          onClick={() => setCommandOpen(true)}
        >
          <MagnifyingGlassIcon className="size-4" />
        </Button>
        {showRefresh ? <DashboardRefreshButton /> : null}
        <UserMenu user={user} />
      </div>
    </header>
  )
}

export function AppBrandBar({ href = '/dashboard' }: { href?: string }) {
  return (
    <div className="flex h-14 shrink-0 items-center border-b border-border px-4 xl:px-6">
      <Link
        href={href}
        className="font-heading text-sm font-semibold tracking-wide text-primary"
      >
        DevPulse
      </Link>
    </div>
  )
}
