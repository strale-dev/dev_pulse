'use server'

import {
  resolveGitHubUserId,
  storeGitHubCredential,
} from '@/lib/auth/store-github-credential'
import { createClient } from '@/lib/server'

export async function completeGitHubOAuthCallback(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return { ok: false, message: error.message }
  }

  const session = data.session
  const user = session?.user

  if (!session || !user) {
    return { ok: false, message: 'Could not establish a session after sign-in.' }
  }

  const providerToken = session.provider_token
  if (!providerToken) {
    return {
      ok: false,
      message:
        'GitHub access token was not returned. Enable provider token storage for the GitHub provider in Supabase Auth.',
    }
  }

  const githubUserId = resolveGitHubUserId(user)
  if (githubUserId === null) {
    return {
      ok: false,
      message: 'Could not read your GitHub user id from the sign-in response.',
    }
  }

  try {
    await storeGitHubCredential({
      userId: user.id,
      providerToken,
      githubUserId,
    })
  } catch (storeError) {
    const message =
      storeError instanceof Error ? storeError.message : 'Failed to store GitHub credentials.'
    return { ok: false, message }
  }

  return { ok: true }
}
