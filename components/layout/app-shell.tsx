'use client'

import { useEffect } from 'react'

import { AppBrandBar, AppHeader } from '@/components/layout/app-header'
import { AppSidebar } from '@/components/layout/app-sidebar'
import type { ShellUser } from '@/lib/dashboard/load-dashboard'
import { useUiStore } from '@/lib/stores/ui-store'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

type AppShellProps = {
  user: ShellUser
  variant?: 'app' | 'minimal'
  showRefresh?: boolean
  children: React.ReactNode
}

export function AppShell({
  user,
  variant = 'app',
  showRefresh = true,
  children,
}: AppShellProps) {
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed)
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen)
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen)
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed)

  useEffect(() => {
    const mqTablet = window.matchMedia('(min-width: 768px)')
    const mqDesktop = window.matchMedia('(min-width: 1280px)')

    const apply = () => {
      if (!mqTablet.matches) {
        setSidebarCollapsed(false)
        return
      }
      setSidebarCollapsed(!mqDesktop.matches)
    }

    apply()
    mqTablet.addEventListener('change', apply)
    mqDesktop.addEventListener('change', apply)
    return () => {
      mqTablet.removeEventListener('change', apply)
      mqDesktop.removeEventListener('change', apply)
    }
  }, [setSidebarCollapsed])

  if (variant === 'minimal') {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <AppBrandBar href="/dashboard" />
        <AppHeader user={user} showRefresh={false} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh bg-background">
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-border lg:flex',
          sidebarCollapsed ? 'w-16' : 'w-60',
        )}
      >
        <AppBrandBar />
        <AppSidebar collapsed={sidebarCollapsed} className="flex-1" />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="font-heading text-sm text-primary">DevPulse</SheetTitle>
          </SheetHeader>
          <AppSidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} showMobileNavTrigger showRefresh={showRefresh} />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
