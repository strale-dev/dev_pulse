import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

const GITHUB_SCOPES = ['read:user', 'user:email'] as const

export function resolveGitHubUserId(user: {
  user_metadata?: Record<string, unknown>
  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> }>
}): bigint | null {
  const identity = user.identities?.find((item) => item.provider === 'github')
  const fromIdentity = identity?.identity_data?.sub ?? identity?.identity_data?.id
  const fromMetadata = user.user_metadata?.sub ?? user.user_metadata?.provider_id

  const raw = fromIdentity ?? fromMetadata
  if (raw === undefined || raw === null) return null

  try {
    return BigInt(String(raw))
  } catch {
    return null
  }
}

export async function storeGitHubCredential(input: {
  userId: string
  providerToken: string
  githubUserId: bigint
}) {
  const encryptionKey = process.env.SUPABASE_TOKEN_ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('Missing SUPABASE_TOKEN_ENCRYPTION_KEY')
  }

  const admin = createAdminClient()
  const { error } = await admin.rpc('store_github_credential', {
    p_user_id: input.userId,
    p_token: input.providerToken,
    p_encryption_key: encryptionKey,
    p_scopes: [...GITHUB_SCOPES],
    p_github_user_id: input.githubUserId.toString(),
    p_token_type: 'bearer',
  })

  if (error) {
    throw new Error(error.message)
  }
}
