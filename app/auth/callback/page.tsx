import { Suspense } from 'react'

import { AuthCallbackClient } from '@/app/auth/callback/auth-callback-client'

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  )
}
