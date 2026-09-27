import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { RepoList } from '@/components/repositories/repo-list'
import { EmptyState } from '@/components/shared/empty-state'
import { loadRepositories } from '@/lib/repositories/load-repositories'
import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { createClient } from '@/lib/server'

export const metadata: Metadata = {
  title: 'Repositories',
}

export default async function RepositoriesPage() {
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

  const repos = await loadRepositories(user.id)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">Repositories</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          All synced public repositories with language breakdown and activity signals.
        </p>
      </div>

      {repos.length === 0 ? (
        <EmptyState
          title="No public repositories found."
          description="Create your first GitHub repository to start building your DevPulse profile."
        />
      ) : (
        <RepoList repos={repos} />
      )}
    </div>
  )
}
