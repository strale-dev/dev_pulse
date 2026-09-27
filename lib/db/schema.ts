import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'citext'
  },
})

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

export const authSchema = pgSchema('auth')

/** Minimal stub for FK references only — managed by Supabase Auth. */
export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
})

export const profiles = pgTable(
  'profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    githubLogin: citext('github_login'),
    displayName: text('display_name'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    timezone: text('timezone'),
    isPublic: boolean('is_public').notNull().default(true),
    onboardingCompletedAt: timestamp('onboarding_completed_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_profiles_github_login').on(table.githubLogin),
    unique('profiles_github_login_unique').on(table.githubLogin),
  ],
)

export const githubCredentials = pgTable(
  'github_credentials',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    providerTokenEncrypted: bytea('provider_token_encrypted').notNull(),
    scopes: text('scopes').array().notNull(),
    tokenType: text('token_type'),
    githubUserId: bigint('github_user_id', { mode: 'bigint' }),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique('github_credentials_github_user_id_unique').on(table.githubUserId)],
)

export const githubProfiles = pgTable(
  'github_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    githubUserId: bigint('github_user_id', { mode: 'bigint' }).notNull(),
    login: citext('login').notNull(),
    name: text('name'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    company: text('company'),
    location: text('location'),
    blog: text('blog'),
    twitterUsername: text('twitter_username'),
    publicRepos: integer('public_repos'),
    followers: integer('followers'),
    following: integer('following'),
    githubCreatedAt: timestamp('github_created_at', { withTimezone: true }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    staleAfter: timestamp('stale_after', { withTimezone: true }).notNull(),
    raw: jsonb('raw').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique('github_profiles_github_user_id_unique').on(table.githubUserId)],
)

export const repositories = pgTable(
  'repositories',
  {
    id: bigint('id', { mode: 'bigint' }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    ownerLogin: citext('owner_login').notNull(),
    name: text('name').notNull(),
    fullName: citext('full_name').notNull(),
    description: text('description'),
    htmlUrl: text('html_url').notNull(),
    homepage: text('homepage'),
    isFork: boolean('is_fork').notNull().default(false),
    isArchived: boolean('is_archived').notNull().default(false),
    isPrivate: boolean('is_private').notNull().default(false),
    primaryLanguage: text('primary_language'),
    stargazersCount: integer('stargazers_count').notNull().default(0),
    forksCount: integer('forks_count').notNull().default(0),
    openIssuesCount: integer('open_issues_count').notNull().default(0),
    defaultBranch: text('default_branch'),
    pushedAt: timestamp('pushed_at', { withTimezone: true }),
    githubCreatedAt: timestamp('github_created_at', { withTimezone: true }),
    githubUpdatedAt: timestamp('github_updated_at', { withTimezone: true }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    staleAfter: timestamp('stale_after', { withTimezone: true }).notNull(),
    raw: jsonb('raw').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_repositories_user_id').on(table.userId),
    index('idx_repositories_user_pushed').on(table.userId, table.pushedAt.desc()),
    index('idx_repositories_user_stars').on(
      table.userId,
      table.stargazersCount.desc(),
    ),
    unique('repositories_user_id_full_name_unique').on(table.userId, table.fullName),
  ],
)

export const repositoryLanguages = pgTable(
  'repository_languages',
  {
    repositoryId: bigint('repository_id', { mode: 'bigint' })
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    bytes: bigint('bytes', { mode: 'bigint' }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.repositoryId, table.language] }),
    index('idx_repo_languages_user').on(table.userId),
  ],
)

export const contributionDays = pgTable(
  'contribution_days',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    contributions: integer('contributions').notNull().default(0),
    level: smallint('level').notNull().default(0),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.day] }),
    index('idx_contrib_days_user_day').on(table.userId, table.day.desc()),
  ],
)

export const activityEvents = pgTable(
  'activity_events',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    commits: integer('commits').notNull().default(0),
    pullRequests: integer('pull_requests').notNull().default(0),
    issues: integer('issues').notNull().default(0),
    codeReviews: integer('code_reviews').notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.day] }),
    index('idx_activity_user_day').on(table.userId, table.day.desc()),
  ],
)

export const analyticsSnapshots = pgTable(
  'analytics_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    windowDays: integer('window_days').notNull().default(365),
    snapshotHash: text('snapshot_hash').notNull(),
    payload: jsonb('payload').notNull(),
    totalCommits: integer('total_commits').notNull(),
    totalPrs: integer('total_prs').notNull(),
    totalIssues: integer('total_issues').notNull(),
    totalRepos: integer('total_repos').notNull(),
    longestStreak: integer('longest_streak').notNull(),
    currentStreak: integer('current_streak').notNull(),
    mostActiveDay: text('most_active_day'),
    mostActiveHourUtc: smallint('most_active_hour_utc'),
    topLanguage: text('top_language'),
    topRepositoryId: bigint('top_repository_id', { mode: 'bigint' }),
    activityTrend: text('activity_trend'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_snapshots_user_created').on(table.userId, table.createdAt.desc()),
    index('idx_snapshots_hash').on(table.userId, table.snapshotHash),
    check(
      'analytics_snapshots_activity_trend_check',
      sql`${table.activityTrend} is null or ${table.activityTrend} in ('up', 'down', 'flat')`,
    ),
  ],
)

export const aiInsights = pgTable(
  'ai_insights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => analyticsSnapshots.id, { onDelete: 'cascade' }),
    snapshotHash: text('snapshot_hash').notNull(),
    model: text('model').notNull(),
    developmentStyle: text('development_style').notNull(),
    technology: text('technology').notNull(),
    consistency: text('consistency').notNull(),
    recommendations: jsonb('recommendations').notNull(),
    tokensUsed: integer('tokens_used'),
    latencyMs: integer('latency_ms'),
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('ai_insights_user_id_snapshot_hash_unique').on(
      table.userId,
      table.snapshotHash,
    ),
    index('idx_ai_insights_user_hash_fresh').on(
      table.userId,
      table.snapshotHash,
      table.expiresAt.desc(),
    ),
  ],
)

export const syncRuns = pgTable(
  'sync_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    steps: jsonb('steps').notNull().default(sql`'[]'::jsonb`),
    githubRateRemaining: integer('github_rate_remaining'),
    githubRateReset: timestamp('github_rate_reset', { withTimezone: true }),
    errorMessage: text('error_message'),
  },
  (table) => [
    index('idx_sync_runs_user_started').on(table.userId, table.startedAt.desc()),
    check(
      'sync_runs_kind_check',
      sql`${table.kind} in ('full', 'partial', 'manual')`,
    ),
    check(
      'sync_runs_status_check',
      sql`${table.status} in ('running', 'success', 'failed', 'partial')`,
    ),
  ],
)
