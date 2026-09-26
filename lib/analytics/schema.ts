import { z } from 'zod'

export const analyticsSnapshotPayloadSchema = z.object({
  totalCommits: z.number().int(),
  totalPRs: z.number().int(),
  totalIssues: z.number().int(),
  totalRepos: z.number().int(),
  topLanguages: z.array(
    z.object({
      language: z.string(),
      percentage: z.number(),
    }),
  ),
  mostActiveDay: z.string().nullable(),
  mostActiveHourUTC: z.number().int().min(0).max(23).nullable(),
  longestStreak: z.number().int(),
  currentStreak: z.number().int(),
  topRepositories: z.array(
    z.object({
      name: z.string(),
      commitsLast90d: z.number().int().nullable(),
      stars: z.number().int(),
    }),
  ),
  activityTrend: z.enum(['up', 'down', 'flat']),
  windowDays: z.number().int(),
  avgCommitsPerActiveDay: z.number().nullable(),
  insufficientData: z.boolean(),
})

export type AnalyticsSnapshotPayload = z.infer<typeof analyticsSnapshotPayloadSchema>
