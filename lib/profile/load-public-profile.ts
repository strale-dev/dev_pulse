import 'server-only'

import { and, desc, eq } from 'drizzle-orm'

import { loadDashboard, type DashboardData, type DashboardTopRepo } from '@/lib/dashboard/load-dashboard'
import { db } from '@/lib/db'
import { githubProfiles, profiles, repositories } from '@/lib/db/schema'

export type PublicProfileIdentity = {
  userId: string
  githubLogin: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  isPublic: boolean
  isOwner: boolean
  followers: number | null
  following: number | null
  publicRepos: number | null
  githubCreatedAt: Date | null
}

export type PublicProfilePageData = PublicProfileIdentity & {
  dashboard: DashboardData
}

function normalizeUsername(raw: string): string {
  return decodeURIComponent(raw).trim().replace(/^@/, '')
}

export async function resolvePublicProfile(
  usernameParam: string,
  viewerUserId: string | null,
): Promise<PublicProfileIdentity | null> {
  const login = normalizeUsername(usernameParam)
  if (!login) return null

  const rows = await db
    .select({
      userId: profiles.userId,
      githubLogin: profiles.githubLogin,
      displayName: profiles.displayName,
      bio: profiles.bio,
      avatarUrl: profiles.avatarUrl,
      isPublic: profiles.isPublic,
      followers: githubProfiles.followers,
      following: githubProfiles.following,
      publicRepos: githubProfiles.publicRepos,
      githubCreatedAt: githubProfiles.githubCreatedAt,
      githubName: githubProfiles.name,
      githubBio: githubProfiles.bio,
      githubAvatarUrl: githubProfiles.avatarUrl,
      githubLoginCached: githubProfiles.login,
    })
    .from(profiles)
    .leftJoin(githubProfiles, eq(githubProfiles.userId, profiles.userId))
    .where(eq(profiles.githubLogin, login))
    .limit(1)

  const row = rows[0]
  if (!row?.githubLogin) return null

  const isOwner = viewerUserId !== null && viewerUserId === row.userId
  if (!row.isPublic && !isOwner) return null

  const githubLogin = row.githubLogin ?? row.githubLoginCached ?? login
  const displayName = row.displayName ?? row.githubName ?? githubLogin

  return {
    userId: row.userId,
    githubLogin,
    displayName,
    bio: row.bio ?? row.githubBio,
    avatarUrl: row.avatarUrl ?? row.githubAvatarUrl,
    isPublic: row.isPublic,
    isOwner,
    followers: row.followers,
    following: row.following,
    publicRepos: row.publicRepos,
    githubCreatedAt: row.githubCreatedAt,
  }
}

export async function loadPublicOgData(usernameParam: string) {
  const identity = await resolvePublicProfile(usernameParam, null)
  if (!identity || !identity.isPublic) return null

  const dashboard = await loadDashboard(identity.userId)
  const languageSegments = dashboard.languageSegments
    .filter((segment) => segment.language !== 'Other')
    .slice(0, 5)

  return {
    ...identity,
    totalCommits: dashboard.overview.totalCommits,
    totalRepos: dashboard.overview.totalRepos,
    totalContributions: dashboard.heatmapStats.totalContributions,
    languageSegments,
  }
}

export async function loadPublicProfilePage(
  usernameParam: string,
  viewerUserId: string | null,
): Promise<PublicProfilePageData | null> {
  const identity = await resolvePublicProfile(usernameParam, viewerUserId)
  if (!identity) return null

  const [dashboard, publicTopRepos] = await Promise.all([
    loadDashboard(identity.userId),
    db
      .select({
        id: repositories.id,
        name: repositories.name,
        description: repositories.description,
        htmlUrl: repositories.htmlUrl,
        primaryLanguage: repositories.primaryLanguage,
        stargazersCount: repositories.stargazersCount,
        forksCount: repositories.forksCount,
      })
      .from(repositories)
      .where(
        and(eq(repositories.userId, identity.userId), eq(repositories.isPrivate, false)),
      )
      .orderBy(desc(repositories.stargazersCount))
      .limit(6),
  ])

  const topRepos: DashboardTopRepo[] = publicTopRepos.map((repo) => ({
    id: repo.id.toString(),
    name: repo.name,
    description: repo.description,
    htmlUrl: repo.htmlUrl,
    primaryLanguage: repo.primaryLanguage,
    stargazersCount: repo.stargazersCount,
    forksCount: repo.forksCount,
    commitsLast90d: dashboard.topRepos.find((item) => item.name === repo.name)?.commitsLast90d ?? null,
  }))

  const languageSegments = dashboard.languageSegments
    .filter((segment) => segment.language !== 'Other')
    .slice(0, 5)

  return {
    ...identity,
    dashboard: {
      ...dashboard,
      topRepos,
      languageSegments,
    },
  }
}
