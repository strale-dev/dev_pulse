import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
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

  const profileRows = await db
    .select({
      onboardingCompletedAt: profiles.onboardingCompletedAt,
      githubLogin: profiles.githubLogin,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1)

  const profile = profileRows[0]
  if (!profile?.onboardingCompletedAt) {
    redirect('/onboarding')
  }

  const display = profile.githubLogin ?? user.email ?? 'Developer'

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6">
      <div className="text-center">
        <p className="font-heading text-sm font-medium tracking-wide text-primary">DevPulse</p>
        <h1 className="font-heading mt-2 text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{display}</span>. Your GitHub data is
          synced.
        </p>
      </div>
      <LogoutButton />
    </div>
  )
}
