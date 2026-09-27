import 'server-only'

import { desc, eq } from 'drizzle-orm'

import { buildAnalyticsSnapshot, persistAnalyticsSnapshot } from '@/lib/analytics/snapshot'
import { getGitHubAccessToken } from '@/lib/auth/get-github-token'
import { db } from '@/lib/db'
import {
  contributionDays,
  githubProfiles,
  repositoryLanguages,
  repositories,
} from '@/lib/db/schema'
import {
  fetchContributionCalendar,
  fetchLanguages,
  fetchProfile,
  fetchRecentEvents,
  fetchRepos,
} from '@/lib/github/fetchers'
import type { RepositoryLanguageInsert } from '@/lib/github/mappers'
import {
  extractCommitHoursUtc,
  mapActivityEvents,
  mapCalendarToContributionDays,
  mapLanguagesToRows,
  mapProfileToGithubProfileRow,
  mapProfileToProfilesPatch,
  mapRepoToRow,
} from '@/lib/github/mappers'
import type {
  ContributionDayPayload,
  GitHubRepo,
  GitHubUser,
  RepoCommit90dPayload,
} from '@/lib/github/types'
import {
  createGraphqlClient,
  createOctokit,
  getLastRateLimitRemaining,
  getLastRateLimitReset,
  resetLastRateLimitRemaining,
} from '@/lib/github/octokit'
import {
  markOnboardingComplete,
  persistActivityEvents,
  persistContributionDays,
  persistGithubProfile,
  persistProfilesPatch,
  persistRepositories,
  persistRepositoryLanguages,
} from '@/lib/github/persist'
import {
  createSyncRun,
  hasSkippedSteps,
  initialSteps,
  setStepFailed,
  setStepRunning,
  setStepSkipped,
  setStepSuccess,
  updateSyncRun,
  type SyncKind,
  type SyncStepRecord,
} from '@/lib/github/sync/sync-run'

const LANGUAGE_STALE_MS = 24 * 60 * 60 * 1000

export type SyncProgressEvent = {
  steps: SyncStepRecord[]
  message: string
}

export type RunSyncOptions = {
  userId: string
  kind: SyncKind
  onProgress?: (event: SyncProgressEvent) => void | Promise<void>
}

function isStale(staleAfter: Date | null | undefined): boolean {
  if (!staleAfter) return true
  return staleAfter.getTime() <= Date.now()
}

function languagesStale(fetchedAt: Date | null | undefined): boolean {
  if (!fetchedAt) return true
  return fetchedAt.getTime() + LANGUAGE_STALE_MS <= Date.now()
}

function forceRefresh(kind: SyncKind): boolean {
  return kind === 'full' || kind === 'manual'
}

async function emit(
  syncRunId: string,
  onProgress: RunSyncOptions['onProgress'],
  steps: SyncStepRecord[],
  message: string,
) {
  await updateSyncRun({ syncRunId, steps })
  await onProgress?.({ steps, message })
}

async function loadExistingProfile(userId: string) {
  const rows = await db
    .select()
    .from(githubProfiles)
    .where(eq(githubProfiles.userId, userId))
    .limit(1)
  return rows[0] ?? null
}

async function loadExistingRepos(userId: string) {
  return db.select().from(repositories).where(eq(repositories.userId, userId))
}

async function loadLatestLanguageFetch(userId: string) {
  const rows = await db
    .select({ fetchedAt: repositoryLanguages.fetchedAt })
    .from(repositoryLanguages)
    .where(eq(repositoryLanguages.userId, userId))
    .orderBy(desc(repositoryLanguages.fetchedAt))
    .limit(1)
  return rows[0]?.fetchedAt ?? null
}

function repoToFetchShape(repo: typeof repositories.$inferSelect): GitHubRepo {
  const raw = repo.raw as GitHubRepo | null
  if (raw) return raw
  return {
    id: Number(repo.id),
    name: repo.name,
    full_name: repo.fullName,
    owner: { login: repo.ownerLogin },
  } as GitHubRepo
}

export async function runSyncPipeline(options: RunSyncOptions): Promise<{ syncRunId: string }> {
  const syncRunId = await createSyncRun(options.userId, options.kind)
  let steps = initialSteps()

  resetLastRateLimitRemaining()

  let profile: GitHubUser | null = null
  let repos: GitHubRepo[] | null = null
  let calendarDays: ContributionDayPayload[] | null = null
  let repoCommitsLast90d: RepoCommit90dPayload[] | null = null
  let events: Awaited<ReturnType<typeof fetchRecentEvents>> | null = null
  let commitHoursUtc: number[] | null = null
  let languageRows: RepositoryLanguageInsert[] = []
  let login = ''

  try {
    const token = await getGitHubAccessToken(options.userId)
    const octokit = createOctokit(token)
    const graphqlClient = createGraphqlClient(token)
    const fetchedAt = new Date()

    const existingProfile = await loadExistingProfile(options.userId)
    login = existingProfile?.login ?? ''

    if (!forceRefresh(options.kind) && existingProfile && !isStale(existingProfile.staleAfter)) {
      steps = setStepSkipped(steps, 'profile')
      await emit(syncRunId, options.onProgress, steps, 'Profile cache is still fresh.')
    } else {
      const started = Date.now()
      steps = setStepRunning(steps, 'profile')
      await emit(syncRunId, options.onProgress, steps, 'Fetching GitHub profile…')
      profile = await fetchProfile(octokit)
      login = profile.login
      steps = setStepSuccess(steps, 'profile', Date.now() - started)
      await emit(syncRunId, options.onProgress, steps, 'Profile fetched.')
    }

    const existingRepos = await loadExistingRepos(options.userId)
    const reposNeedRefresh =
      forceRefresh(options.kind) ||
      existingRepos.length === 0 ||
      existingRepos.some((repo) => isStale(repo.staleAfter))

    if (!reposNeedRefresh) {
      steps = setStepSkipped(steps, 'repos')
      repos = existingRepos.map(repoToFetchShape)
      await emit(syncRunId, options.onProgress, steps, 'Repository list is still fresh.')
    } else {
      const started = Date.now()
      steps = setStepRunning(steps, 'repos')
      await emit(syncRunId, options.onProgress, steps, 'Fetching repositories…')
      repos = await fetchRepos(octokit)
      steps = setStepSuccess(steps, 'repos', Date.now() - started)
      await emit(syncRunId, options.onProgress, steps, `Fetched ${repos.length} public repositories.`)
    }

    const latestLangFetch = await loadLatestLanguageFetch(options.userId)
    const languagesNeedRefresh = forceRefresh(options.kind) || languagesStale(latestLangFetch)

    if (!languagesNeedRefresh) {
      steps = setStepSkipped(steps, 'languages')
      await emit(syncRunId, options.onProgress, steps, 'Language stats are still fresh.')
    } else {
      const started = Date.now()
      steps = setStepRunning(steps, 'languages')
      await emit(syncRunId, options.onProgress, steps, 'Fetching repository languages…')

      const repoList = repos ?? []
      for (const repo of repoList) {
        const ownerLogin = repo.owner?.login ?? repo.full_name.split('/')[0] ?? ''
        const langs = await fetchLanguages(octokit, ownerLogin, repo.name)
        languageRows.push(
          ...mapLanguagesToRows(options.userId, BigInt(repo.id), langs, fetchedAt),
        )
      }

      steps = setStepSuccess(steps, 'languages', Date.now() - started)
      await emit(syncRunId, options.onProgress, steps, 'Languages fetched.')
    }

    const calendarFresh =
      !forceRefresh(options.kind) && existingProfile && !isStale(existingProfile.staleAfter)

    if (calendarFresh) {
      steps = setStepSkipped(steps, 'contribution_calendar')
      await emit(syncRunId, options.onProgress, steps, 'Contribution calendar is still fresh.')
    } else {
      const started = Date.now()
      steps = setStepRunning(steps, 'contribution_calendar')
      await emit(syncRunId, options.onProgress, steps, 'Fetching contribution calendar…')
      const calendar = await fetchContributionCalendar(graphqlClient)
      calendarDays = calendar.days
      repoCommitsLast90d = calendar.repoCommitsLast90d
      steps = setStepSuccess(steps, 'contribution_calendar', Date.now() - started)
      await emit(syncRunId, options.onProgress, steps, 'Contribution calendar fetched.')
    }

    const eventsFresh =
      !forceRefresh(options.kind) && existingProfile && !isStale(existingProfile.staleAfter)

    if (eventsFresh) {
      steps = setStepSkipped(steps, 'events')
      await emit(syncRunId, options.onProgress, steps, 'Activity events are still fresh.')
    } else {
      const started = Date.now()
      steps = setStepRunning(steps, 'events')
      await emit(syncRunId, options.onProgress, steps, 'Fetching recent public events…')
      if (!login) {
        profile = profile ?? (await fetchProfile(octokit))
        login = profile.login
      }
      events = await fetchRecentEvents(octokit, login)
      commitHoursUtc = extractCommitHoursUtc(events)
      steps = setStepSuccess(steps, 'events', Date.now() - started)
      await emit(syncRunId, options.onProgress, steps, 'Events fetched.')
    }

    const persistStarted = Date.now()
    steps = setStepRunning(steps, 'persist')
    await emit(syncRunId, options.onProgress, steps, 'Saving to database…')

    if (profile) {
      await persistGithubProfile(mapProfileToGithubProfileRow(options.userId, profile, fetchedAt))
      await persistProfilesPatch(options.userId, mapProfileToProfilesPatch(profile))
    }

    if (reposNeedRefresh && repos) {
      await persistRepositories(
        options.userId,
        repos.map((repo) => mapRepoToRow(options.userId, repo, fetchedAt)),
      )
    }

    if (languagesNeedRefresh) {
      await persistRepositoryLanguages(options.userId, languageRows)
    }

    if (calendarDays) {
      await persistContributionDays(
        mapCalendarToContributionDays(options.userId, calendarDays, fetchedAt),
      )
    }

    if (events) {
      let daysForActivity = calendarDays
      if (!daysForActivity) {
        const stored = await db
          .select()
          .from(contributionDays)
          .where(eq(contributionDays.userId, options.userId))
        daysForActivity = stored.map((row) => ({
          date: row.day,
          contributionCount: row.contributions,
          contributionLevel: 'NONE' as const,
        }))
      }
      await persistActivityEvents(mapActivityEvents(options.userId, daysForActivity, events))
    }

    steps = setStepSuccess(steps, 'persist', Date.now() - persistStarted)
    await emit(syncRunId, options.onProgress, steps, 'Database updated.')

    const snapshotNeeded =
      forceRefresh(options.kind) ||
      profile !== null ||
      reposNeedRefresh ||
      calendarDays !== null ||
      events !== null ||
      languagesNeedRefresh

    if (snapshotNeeded) {
      const started = Date.now()
      steps = setStepRunning(steps, 'analytics_snapshot')
      await emit(syncRunId, options.onProgress, steps, 'Computing analytics snapshot…')
      const snapshot = await buildAnalyticsSnapshot({
        userId: options.userId,
        ...(commitHoursUtc ? { commitHoursUtc } : {}),
        ...(repoCommitsLast90d ? { repoCommitsLast90d } : {}),
      })
      await persistAnalyticsSnapshot(options.userId, snapshot)
      steps = setStepSuccess(steps, 'analytics_snapshot', Date.now() - started)
      await emit(syncRunId, options.onProgress, steps, 'Analytics snapshot saved.')
    } else {
      steps = setStepSkipped(steps, 'analytics_snapshot')
    }

    if (options.kind === 'full' || options.kind === 'manual') {
      await markOnboardingComplete(options.userId)
    }

    await updateSyncRun({
      syncRunId,
      steps,
      status: hasSkippedSteps(steps) ? 'partial' : 'success',
      finishedAt: new Date(),
      githubRateRemaining: getLastRateLimitRemaining(),
      githubRateReset: getLastRateLimitReset(),
    })

    await emit(syncRunId, options.onProgress, steps, 'Sync complete.')

    return { syncRunId }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Something went wrong during sync.'
    const runningStep = steps.find((step) => step.status === 'running')
    if (runningStep) {
      steps = setStepFailed(steps, runningStep.name, 0, message)
    }
    await updateSyncRun({
      syncRunId,
      steps,
      status: 'failed',
      finishedAt: new Date(),
      githubRateRemaining: getLastRateLimitRemaining(),
      githubRateReset: getLastRateLimitReset(),
      errorMessage: message,
    })
    await emit(syncRunId, options.onProgress, steps, message)
    throw error
  }
}
