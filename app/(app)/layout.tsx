import { redirect } from 'next/navigation'

import { AppShell } from '@/components/layout/app-shell'
import { loadShellUser } from '@/lib/dashboard/load-dashboard'
import { createClient } from '@/lib/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const shellUser = await loadShellUser(user.id, user.email ?? null)

  return (
    <AppShell user={shellUser} variant="app">
      {children}
    </AppShell>
  )
}
