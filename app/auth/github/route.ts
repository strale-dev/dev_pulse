import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { requestSiteOrigin } from '@/lib/request-site-origin'
import { safeNextPathServer } from '@/lib/safe-next-path'

function copySupabaseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie)
  })
  for (const header of ['cache-control', 'expires', 'pragma'] as const) {
    const value = from.headers.get(header)
    if (value) to.headers.set(header, value)
  }
}

export async function GET(request: NextRequest) {
  const origin = requestSiteOrigin(request)
  const next = safeNextPathServer(
    request.nextUrl.searchParams.get('next'),
    '/dashboard',
    origin
  )
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

  let cookieCarrier = NextResponse.next({ request })

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
            cookieCarrier.cookies.set(name, value, options)
          )
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              cookieCarrier.headers.set(key, value)
            )
          }
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'read:user user:email',
      redirectTo,
    },
  })

  if (error || !data.url) {
    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', error?.message ?? 'Could not start GitHub OAuth.')
    const errorResponse = NextResponse.redirect(errorUrl)
    copySupabaseCookies(cookieCarrier, errorResponse)
    return errorResponse
  }

  const oauthRedirect = NextResponse.redirect(data.url)
  copySupabaseCookies(cookieCarrier, oauthRedirect)
  return oauthRedirect
}
