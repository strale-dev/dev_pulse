import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

export async function getGitHubAccessToken(userId: string): Promise<string> {
  const encryptionKey = process.env.SUPABASE_TOKEN_ENCRYPTION_KEY
  if (!encryptionKey) {
    throw new Error('Missing SUPABASE_TOKEN_ENCRYPTION_KEY')
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('get_github_provider_token', {
    p_user_id: userId,
    p_encryption_key: encryptionKey,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (typeof data !== 'string' || data.length === 0) {
    throw new Error('GitHub access token could not be decrypted.')
  }

  return data
}
