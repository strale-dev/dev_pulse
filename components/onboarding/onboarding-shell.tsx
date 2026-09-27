'use client'

import { AppShell } from '@/components/layout/app-shell'
import type { ShellUser } from '@/lib/dashboard/load-dashboard'

export function OnboardingShell({
  user,
  children,
}: {
  user: ShellUser
  children: React.ReactNode
}) {
  return (
    <AppShell user={user} variant="minimal" showRefresh={false}>
      {children}
    </AppShell>
  )
}
