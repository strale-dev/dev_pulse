import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ContributionHeatmap } from '@/components/dashboard/contribution-heatmap'
import { LanguageDonut } from '@/components/dashboard/language-donut'
import { OverviewCards } from '@/components/dashboard/overview-cards'
import { TopReposPreview } from '@/components/dashboard/top-repos-preview'
import { PublicProfileHeader } from '@/components/profile/public-profile-header'
import { PublicProfileShell } from '@/components/profile/public-profile-shell'
import { FadeIn } from '@/components/shared/fade-in'
import { loadPublicProfilePage } from '@/lib/profile/load-public-profile'
import { createClient } from '@/lib/server'

type PageProps = {
  params: Promise<{ username: string }>
}

async function getViewerId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  const viewerId = await getViewerId()
  const data = await loadPublicProfilePage(username, viewerId)
  if (!data) {
    return { title: 'Not found' }
  }
  const title = `${data.displayName} (@${data.githubLogin})`
  const description = data.bio ?? `${data.displayName}'s public DevPulse profile.`
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params
  const viewerId = await getViewerId()
  const data = await loadPublicProfilePage(username, viewerId)
  if (!data) {
    notFound()
  }

  return (
    <PublicProfileShell signedIn={viewerId !== null}>
      <FadeIn className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <PublicProfileHeader profile={data} />
        <OverviewCards overview={data.dashboard.overview} />
        <div className="grid gap-6 lg:grid-cols-2">
          <ContributionHeatmap
            weeks={data.dashboard.contributionWeeks}
            stats={data.dashboard.heatmapStats}
          />
          <LanguageDonut segments={data.dashboard.languageSegments} />
        </div>
        <TopReposPreview repos={data.dashboard.topRepos} />
      </FadeIn>
    </PublicProfileShell>
  )
}
