import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { InsightSection } from '@/components/insights/insight-section'
import { loadInsightView } from '@/lib/ai/insight-store'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { createClient } from '@/lib/server'

export const metadata: Metadata = {
  title: 'Insights',
}

export default async function InsightsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const profileRows = await db
    .select({ onboardingCompletedAt: profiles.onboardingCompletedAt })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1)

  if (!profileRows[0]?.onboardingCompletedAt) {
    redirect('/onboarding')
  }

  const view = await loadInsightView(user.id)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">Insights</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          A short read of your synced analytics. Regenerate replaces the 24-hour cache.
        </p>
      </div>
      <InsightSection
        hasSnapshot={view.hasSnapshot}
        snapshotHash={view.snapshotHash}
        initial={view.insight}
        generatedAt={view.generatedAt}
      />
    </div>
  )
}
