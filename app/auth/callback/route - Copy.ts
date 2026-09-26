import { NextResponse } from 'next/server'

import {
  resolveGitHubUserId,
  storeGitHubCredential,
} from '@/lib/auth/store-github-credential'
import { safeNextPathServer } from '@/lib/safe-next-path'
import { createClient } from '@/lib/server'

function siteOrigin() {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  return url.replace(/\/$/, '')
}

function redirectToError(message: string) {
  return NextResponse.redirect(
    `${siteOrigin()}/auth/error?error=${encodeURIComponent(message)}`
  )
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const oauthError = requestUrl.searchParams.get('error')
  const oauthDescription = requestUrl.searchParams.get('error_description')

  if (oauthError) {
    const message = oauthDescription ?? oauthError
    return redirectToError(message)
  }

  if (!code) {
    return redirectToError('Missing authorization code from GitHub.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return redirectToError(error.message)
  }

  const session = data.session
  const user = session?.user

  if (!session || !user) {
    return redirectToError('Could not establish a session after sign-in.')
  }

  const providerToken = session.provider_token
  if (!providerToken) {
    return redirectToError(
      'GitHub access token was not returned. Enable provider token storage for the GitHub provider in Supabase Auth.'
    )
  }

  const githubUserId = resolveGitHubUserId(user)
  if (githubUserId === null) {
    return redirectToError('Could not read your GitHub user id from the sign-in response.')
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
    return redirectToError(message)
  }

  const destination = safeNextPathServer(next, '/dashboard', siteOrigin())
  return NextResponse.redirect(`${siteOrigin()}${destination}`)
}
