/**
 * TEMPORARY (Phase 4): minimal first-sync progress screen.
 * Phase 6 will replace this with shadcn/ui + AppShell layout (see Tech.md §13 Phase 6).
 */
import { redirect } from 'next/navigation'

import { getOnboardingStatus } from '@/app/(app)/actions/sync'
import { SyncOnboarding } from '@/components/onboarding/sync-onboarding'
import { createClient } from '@/lib/server'

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

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 py-12">
      <SyncOnboarding />
    </div>
  )
}
