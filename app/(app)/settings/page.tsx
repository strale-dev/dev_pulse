import type { Metadata } from 'next'
import { desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { PublicProfileToggle } from '@/components/settings/public-profile-toggle'
import { FadeIn } from '@/components/shared/fade-in'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/lib/db'
import { profiles, syncRuns } from '@/lib/db/schema'
import { createClient } from '@/lib/server'

export const metadata: Metadata = {
  title: 'Settings',
}

function formatReset(value: Date | null): string {
  if (!value) return '—'
  return value.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }) + ' UTC'
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [profileRows, syncRows] = await Promise.all([
    db
      .select({
        isPublic: profiles.isPublic,
        githubLogin: profiles.githubLogin,
      })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1),
    db
      .select({
        githubRateRemaining: syncRuns.githubRateRemaining,
        githubRateReset: syncRuns.githubRateReset,
        finishedAt: syncRuns.finishedAt,
        status: syncRuns.status,
      })
      .from(syncRuns)
      .where(eq(syncRuns.userId, user.id))
      .orderBy(desc(syncRuns.startedAt))
      .limit(1),
  ])

  const profile = profileRows[0]
  if (!profile) {
    redirect('/onboarding')
  }

  const sync = syncRows[0]
  const profilePath = profile.githubLogin ? `/u/${profile.githubLogin}` : null

  return (
    <FadeIn className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-lg font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Profile visibility and GitHub API budget.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
          <CardDescription>
            Controls whether your shareable DevPulse URL is visible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PublicProfileToggle
            isPublic={profile.isPublic}
            profilePath={profilePath}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GitHub rate limit</CardTitle>
          <CardDescription>
            Snapshot captured at the end of your last sync. Debug only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sync ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Remaining</dt>
                <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                  {sync.githubRateRemaining ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Resets at</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {formatReset(sync.githubRateReset)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Last sync</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {sync.status}
                  {sync.finishedAt
                    ? ` · ${sync.finishedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
                    : ''}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sync has run yet. Rate-limit numbers appear after your first GitHub sync.
            </p>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  )
}
