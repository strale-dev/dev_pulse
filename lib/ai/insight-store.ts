import 'server-only'

import { and, desc, eq, gt } from 'drizzle-orm'

import { insightsSchema, type Insights } from '@/lib/ai/schema'
import { db } from '@/lib/db'
import { aiInsights, analyticsSnapshots } from '@/lib/db/schema'

export type LatestSnapshot = {
  id: string
  snapshotHash: string
  payload: unknown
}

export type InsightView = {
  hasSnapshot: boolean
  snapshotHash: string | null
  insight: Insights | null
  generatedAt: string | null
}

export async function loadLatestSnapshot(userId: string): Promise<LatestSnapshot | null> {
  const rows = await db
    .select({
      id: analyticsSnapshots.id,
      snapshotHash: analyticsSnapshots.snapshotHash,
      payload: analyticsSnapshots.payload,
    })
    .from(analyticsSnapshots)
    .where(eq(analyticsSnapshots.userId, userId))
    .orderBy(desc(analyticsSnapshots.createdAt))
    .limit(1)

  return rows[0] ?? null
}

export async function loadFreshInsight(
  userId: string,
  snapshotHash: string,
  now = new Date(),
): Promise<{ insight: Insights; generatedAt: string } | null> {
  const rows = await db
    .select({
      developmentStyle: aiInsights.developmentStyle,
      technology: aiInsights.technology,
      consistency: aiInsights.consistency,
      recommendations: aiInsights.recommendations,
      generatedAt: aiInsights.generatedAt,
    })
    .from(aiInsights)
    .where(
      and(
        eq(aiInsights.userId, userId),
        eq(aiInsights.snapshotHash, snapshotHash),
        gt(aiInsights.expiresAt, now),
      ),
    )
    .limit(1)

  const row = rows[0]
  if (!row) return null

  const parsed = insightsSchema.safeParse({
    developmentStyle: row.developmentStyle,
    technology: row.technology,
    consistency: row.consistency,
    recommendations: row.recommendations,
  })
  if (!parsed.success) return null

  return {
    insight: parsed.data,
    generatedAt: row.generatedAt.toISOString(),
  }
}

export async function loadLatestInsightGeneratedAt(userId: string): Promise<Date | null> {
  const rows = await db
    .select({ generatedAt: aiInsights.generatedAt })
    .from(aiInsights)
    .where(eq(aiInsights.userId, userId))
    .orderBy(desc(aiInsights.generatedAt))
    .limit(1)

  return rows[0]?.generatedAt ?? null
}

export async function loadInsightView(userId: string): Promise<InsightView> {
  const snapshot = await loadLatestSnapshot(userId)
  if (!snapshot) {
    return { hasSnapshot: false, snapshotHash: null, insight: null, generatedAt: null }
  }

  const cached = await loadFreshInsight(userId, snapshot.snapshotHash)
  if (!cached) {
    return {
      hasSnapshot: true,
      snapshotHash: snapshot.snapshotHash,
      insight: null,
      generatedAt: null,
    }
  }

  return {
    hasSnapshot: true,
    snapshotHash: snapshot.snapshotHash,
    insight: cached.insight,
    generatedAt: cached.generatedAt,
  }
}

export async function upsertAiInsight(input: {
  userId: string
  snapshotId: string
  snapshotHash: string
  model: string
  insight: Insights
  tokensUsed: number | null
  latencyMs: number
  generatedAt: Date
  expiresAt: Date
}): Promise<void> {
  const values = {
    userId: input.userId,
    snapshotId: input.snapshotId,
    snapshotHash: input.snapshotHash,
    model: input.model,
    developmentStyle: input.insight.developmentStyle,
    technology: input.insight.technology,
    consistency: input.insight.consistency,
    recommendations: input.insight.recommendations,
    tokensUsed: input.tokensUsed,
    latencyMs: input.latencyMs,
    generatedAt: input.generatedAt,
    expiresAt: input.expiresAt,
  }

  await db
    .insert(aiInsights)
    .values(values)
    .onConflictDoUpdate({
      target: [aiInsights.userId, aiInsights.snapshotHash],
      set: {
        snapshotId: values.snapshotId,
        model: values.model,
        developmentStyle: values.developmentStyle,
        technology: values.technology,
        consistency: values.consistency,
        recommendations: values.recommendations,
        tokensUsed: values.tokensUsed,
        latencyMs: values.latencyMs,
        generatedAt: values.generatedAt,
        expiresAt: values.expiresAt,
      },
    })
}
