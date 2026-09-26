import 'server-only'

// TODO(perf): Replace per-row upserts in persistContributionDays / persistActivityEvents /
// persistRepositories with batch INSERT ... ON CONFLICT (multi-row) — full sync persist is
// ~55s+ for accounts with many repos; optimize in a follow-up, not Phase 4 exit blocker.

import { and, eq, notInArray } from 'drizzle-orm'

import { db } from '@/lib/db'
import {
  activityEvents,
  contributionDays,
  githubProfiles,
  profiles,
  repositories,
  repositoryLanguages,
} from '@/lib/db/schema'
import type {
  ActivityEventInsert,
  ContributionDayInsert,
  GithubProfileInsert,
  ProfilesPatch,
  RepositoryInsert,
  RepositoryLanguageInsert,
} from '@/lib/github/mappers'

export async function persistGithubProfile(row: GithubProfileInsert) {
  await db
    .insert(githubProfiles)
    .values({
      userId: row.userId,
      githubUserId: row.githubUserId,
      login: row.login,
      name: row.name,
      bio: row.bio,
      avatarUrl: row.avatarUrl,
      company: row.company,
      location: row.location,
      blog: row.blog,
      twitterUsername: row.twitterUsername,
      publicRepos: row.publicRepos,
      followers: row.followers,
      following: row.following,
      githubCreatedAt: row.githubCreatedAt,
      fetchedAt: row.fetchedAt,
      staleAfter: row.staleAfter,
      raw: row.raw,
    })
    .onConflictDoUpdate({
      target: githubProfiles.userId,
      set: {
        githubUserId: row.githubUserId,
        login: row.login,
        name: row.name,
        bio: row.bio,
        avatarUrl: row.avatarUrl,
        company: row.company,
        location: row.location,
        blog: row.blog,
        twitterUsername: row.twitterUsername,
        publicRepos: row.publicRepos,
        followers: row.followers,
        following: row.following,
        githubCreatedAt: row.githubCreatedAt,
        fetchedAt: row.fetchedAt,
        staleAfter: row.staleAfter,
        raw: row.raw,
      },
    })
}

export async function persistProfilesPatch(userId: string, patch: ProfilesPatch) {
  await db
    .update(profiles)
    .set({
      githubLogin: patch.githubLogin,
      displayName: patch.displayName,
      bio: patch.bio,
      avatarUrl: patch.avatarUrl,
    })
    .where(eq(profiles.userId, userId))
}

export async function persistRepositories(userId: string, rows: RepositoryInsert[]) {
  if (rows.length === 0) {
    await db.delete(repositories).where(eq(repositories.userId, userId))
    return
  }

  const ids = rows.map((row) => row.id)

  for (const row of rows) {
    await db
      .insert(repositories)
      .values({
        id: row.id,
        userId: row.userId,
        ownerLogin: row.ownerLogin,
        name: row.name,
        fullName: row.fullName,
        description: row.description,
        htmlUrl: row.htmlUrl,
        homepage: row.homepage,
        isFork: row.isFork,
        isArchived: row.isArchived,
        isPrivate: row.isPrivate,
        primaryLanguage: row.primaryLanguage,
        stargazersCount: row.stargazersCount,
        forksCount: row.forksCount,
        openIssuesCount: row.openIssuesCount,
        defaultBranch: row.defaultBranch,
        pushedAt: row.pushedAt,
        githubCreatedAt: row.githubCreatedAt,
        githubUpdatedAt: row.githubUpdatedAt,
        fetchedAt: row.fetchedAt,
        staleAfter: row.staleAfter,
        raw: row.raw,
      })
      .onConflictDoUpdate({
        target: repositories.id,
        set: {
          userId: row.userId,
          ownerLogin: row.ownerLogin,
          name: row.name,
          fullName: row.fullName,
          description: row.description,
          htmlUrl: row.htmlUrl,
          homepage: row.homepage,
          isFork: row.isFork,
          isArchived: row.isArchived,
          isPrivate: row.isPrivate,
          primaryLanguage: row.primaryLanguage,
          stargazersCount: row.stargazersCount,
          forksCount: row.forksCount,
          openIssuesCount: row.openIssuesCount,
          defaultBranch: row.defaultBranch,
          pushedAt: row.pushedAt,
          githubCreatedAt: row.githubCreatedAt,
          githubUpdatedAt: row.githubUpdatedAt,
          fetchedAt: row.fetchedAt,
          staleAfter: row.staleAfter,
          raw: row.raw,
        },
      })
  }

  await db
    .delete(repositories)
    .where(and(eq(repositories.userId, userId), notInArray(repositories.id, ids)))
}

export async function persistRepositoryLanguages(userId: string, rows: RepositoryLanguageInsert[]) {
  await db.delete(repositoryLanguages).where(eq(repositoryLanguages.userId, userId))
  if (rows.length === 0) return

  await db.insert(repositoryLanguages).values(
    rows.map((row) => ({
      repositoryId: row.repositoryId,
      userId: row.userId,
      language: row.language,
      bytes: row.bytes,
      fetchedAt: row.fetchedAt,
    })),
  )
}

export async function persistContributionDays(rows: ContributionDayInsert[]) {
  if (rows.length === 0) return

  for (const row of rows) {
    await db
      .insert(contributionDays)
      .values({
        userId: row.userId,
        day: row.day,
        contributions: row.contributions,
        level: row.level,
        fetchedAt: row.fetchedAt,
      })
      .onConflictDoUpdate({
        target: [contributionDays.userId, contributionDays.day],
        set: {
          contributions: row.contributions,
          level: row.level,
          fetchedAt: row.fetchedAt,
        },
      })
  }
}

export async function persistActivityEvents(rows: ActivityEventInsert[]) {
  if (rows.length === 0) return

  for (const row of rows) {
    await db
      .insert(activityEvents)
      .values({
        userId: row.userId,
        day: row.day,
        commits: row.commits,
        pullRequests: row.pullRequests,
        issues: row.issues,
        codeReviews: row.codeReviews,
      })
      .onConflictDoUpdate({
        target: [activityEvents.userId, activityEvents.day],
        set: {
          commits: row.commits,
          pullRequests: row.pullRequests,
          issues: row.issues,
          codeReviews: row.codeReviews,
        },
      })
  }
}

export async function markOnboardingComplete(userId: string) {
  await db
    .update(profiles)
    .set({ onboardingCompletedAt: new Date() })
    .where(eq(profiles.userId, userId))
}
