'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { completeGitHubOAuthCallback } from '@/app/auth/callback/actions'
import { createClient } from '@/lib/client'
import { safeNextPath } from '@/lib/safe-next-path'

export function AuthCallbackClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function finish() {
      const oauthError = searchParams.get('error')
      const oauthDescription = searchParams.get('error_description')
      if (oauthError) {
        const message = oauthDescription ?? oauthError
        router.replace(`/auth/error?error=${encodeURIComponent(message)}`)
        return
      }

      const code = searchParams.get('code')
      if (!code) {
        router.replace(
          `/auth/error?error=${encodeURIComponent('Missing authorization code from GitHub.')}`
        )
        return
      }

      const next = safeNextPath(searchParams.get('next'), '/dashboard')
      const supabase = createClient()
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        router.replace(`/auth/error?error=${encodeURIComponent(exchangeError.message)}`)
        return
      }

      const completed = await completeGitHubOAuthCallback()
      if (!completed.ok) {
        router.replace(`/auth/error?error=${encodeURIComponent(completed.message)}`)
        return
      }

      router.replace(next)
    }

    void finish()
  }, [router, searchParams])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-heading text-sm font-medium text-primary">DevPulse</p>
      <p className="text-sm text-muted-foreground">Finishing GitHub sign-in…</p>
    </div>
  )
}
