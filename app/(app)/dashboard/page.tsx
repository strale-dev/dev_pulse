import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { ActivityChart } from '@/components/dashboard/activity-chart'
import { DevelopmentStats } from '@/components/dashboard/development-stats'
import { ContributionHeatmap } from '@/components/dashboard/contribution-heatmap'
import { LanguageDonut } from '@/components/dashboard/language-donut'
import { OverviewCards } from '@/components/dashboard/overview-cards'
import { RecentActivityList } from '@/components/dashboard/recent-activity-list'
import { TopReposPreview } from '@/components/dashboard/top-repos-preview'
import { InsightSection } from '@/components/insights/insight-section'
import { loadInsightView } from '@/lib/ai/insight-store'
import { loadDashboard } from '@/lib/dashboard/load-dashboard'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { createClient } from '@/lib/server'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
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

  const [data, insights] = await Promise.all([
    loadDashboard(user.id),
    loadInsightView(user.id),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">Overview</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Your synced GitHub activity at a glance.
        </p>
      </div>

      <OverviewCards overview={data.overview} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TopReposPreview repos={data.topRepos} />
        <RecentActivityList days={data.recentActivity} />
      </div>

      <ActivityChart days={data.activityDays} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ContributionHeatmap weeks={data.contributionWeeks} stats={data.heatmapStats} />
        <LanguageDonut segments={data.languageSegments} />
      </div>

      <DevelopmentStats stats={data.developmentStats} />

      <InsightSection
        hasSnapshot={insights.hasSnapshot}
        snapshotHash={insights.snapshotHash}
        initial={insights.insight}
        generatedAt={insights.generatedAt}
      />
    </div>
  )
}
