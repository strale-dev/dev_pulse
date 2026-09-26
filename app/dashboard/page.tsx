import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { createClient } from '@/lib/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const meta = user.user_metadata
  const display =
    (typeof meta?.user_name === 'string' && meta.user_name) ||
    (typeof meta?.preferred_username === 'string' && meta.preferred_username) ||
    user.email ||
    'Developer'

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6">
      <div className="text-center">
        <p className="font-heading text-sm font-medium tracking-wide text-primary">DevPulse</p>
        <h1 className="font-heading mt-2 text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{display}</span>. GitHub sync arrives in a
          later phase.
        </p>
      </div>
      <LogoutButton />
    </div>
  )
}
