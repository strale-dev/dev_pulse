import { redirect } from 'next/navigation'

import { getOnboardingStatus } from '@/app/(app)/actions/sync'
import { SyncOnboarding } from '@/components/onboarding/sync-onboarding'
import { OnboardingShell } from '@/components/onboarding/onboarding-shell'
import { createClient } from '@/lib/server'
import { loadShellUser } from '@/lib/dashboard/load-dashboard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const status = await getOnboardingStatus()
  if (status.completed) {
    redirect('/dashboard')
  }

  const shellUser = await loadShellUser(user.id, user.email ?? null)

  return (
    <OnboardingShell user={shellUser}>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <SyncOnboarding />
      </div>
    </OnboardingShell>
  )
}
