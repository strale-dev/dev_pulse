'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GitBranchIcon, SquaresFourIcon } from '@phosphor-icons/react'

import { APP_NAV_ITEMS } from '@/components/layout/nav-config'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/lib/stores/ui-store'

const NAV_ICONS = {
  '/dashboard': SquaresFourIcon,
  '/repositories': GitBranchIcon,
} as const

type AppSidebarProps = {
  collapsed?: boolean
  onNavigate?: () => void
  className?: string
}

export function AppSidebar({ collapsed = false, onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname()
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen)

  return (
    <nav
      className={cn(
        'flex flex-col gap-1 p-3',
        collapsed ? 'items-center px-2' : undefined,
        className,
      )}
      aria-label="Main"
    >
      {APP_NAV_ITEMS.map((item) => {
        const Icon = NAV_ICONS[item.href as keyof typeof NAV_ICONS] ?? SquaresFourIcon
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => {
              onNavigate?.()
              setMobileNavOpen(false)
            }}
            className={cn(
              'flex items-center gap-2 rounded-md px-2.5 py-2 text-xs/relaxed font-medium transition-colors',
              collapsed ? 'justify-center px-2' : undefined,
              active
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="size-4 shrink-0" weight={active ? 'fill' : 'regular'} />
            {collapsed ? (
              <span className="sr-only">{item.label}</span>
            ) : (
              <span>{item.label}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
