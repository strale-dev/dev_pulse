import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  resolveGitHubUserId,
  storeGitHubCredential,
} from '@/lib/auth/store-github-credential'
import { requestSiteOrigin } from '@/lib/request-site-origin'
import { safeNextPathServer } from '@/lib/safe-next-path'

function redirectToError(request: NextRequest, message: string) {
  const errorUrl = new URL('/auth/error', requestSiteOrigin(request))
  errorUrl.searchParams.set('error', message)
  return NextResponse.redirect(errorUrl)
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const oauthError = requestUrl.searchParams.get('error')
  const oauthDescription = requestUrl.searchParams.get('error_description')

  if (oauthError) {
    return redirectToError(request, oauthDescription ?? oauthError)
  }

  if (!code) {
    return redirectToError(request, 'Missing authorization code from GitHub.')
  }

  const origin = requestSiteOrigin(request)
  const destination = safeNextPathServer(next, '/dashboard', origin)
  let response = NextResponse.redirect(`${origin}${destination}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              response.headers.set(key, value)
            )
          }
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return redirectToError(request, error.message)
  }

  const session = data.session
  const user = session?.user

  if (!session || !user) {
    return redirectToError(request, 'Could not establish a session after sign-in.')
  }

  const providerToken = session.provider_token
  if (!providerToken) {
    return redirectToError(
      request,
      'GitHub access token was not returned. Enable provider token storage for the GitHub provider in Supabase Auth.'
    )
  }

  const githubUserId = resolveGitHubUserId(user)
  if (githubUserId === null) {
    return redirectToError(request, 'Could not read your GitHub user id from the sign-in response.')
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
    return redirectToError(request, message)
  }

  return response
}
