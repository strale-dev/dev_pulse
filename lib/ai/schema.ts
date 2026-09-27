import { z } from 'zod'

const insightParagraph = z
  .string()
  .min(1)
  .describe('2–3 sentences. Only claims supported by the analytics snapshot numbers.')

export const insightsSchema = z.object({
  developmentStyle: insightParagraph.describe(
    'Development style in 2–3 sentences, grounded in the snapshot.',
  ),
  technology: insightParagraph.describe(
    'Technology focus in 2–3 sentences, grounded in the snapshot.',
  ),
  consistency: insightParagraph.describe(
    'Consistency in 2–3 sentences, grounded in the snapshot.',
  ),
  recommendations: z
    .array(z.string().min(1).max(240))
    .min(3)
    .max(5)
    .describe('3–5 short bullets, phrased as suggestions, never as objective judgments.'),
})

export type Insights = z.infer<typeof insightsSchema>

export const insightsRequestSchema = z.object({
  regenerate: z.boolean().optional().default(false),
})
