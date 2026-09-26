'use client'

import { GithubLogo } from '@phosphor-icons/react'
import { useState } from 'react'

import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type GitHubSignInButtonProps = React.ComponentProps<typeof Button> & {
  nextPath?: string
}

export function GitHubSignInButton({
  className,
  nextPath = '/dashboard',
  ...props
}: GitHubSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) {
      window.location.assign('/auth/error?error=Missing%20NEXT_PUBLIC_SITE_URL')
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    const redirectTo = `${siteUrl.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(nextPath)}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'read:user user:email',
        redirectTo,
      },
    })

    if (error) {
      setIsLoading(false)
      window.location.assign(`/auth/error?error=${encodeURIComponent(error.message)}`)
    }
  }

  return (
    <Button
      type="button"
      className={cn('gap-2', className)}
      disabled={isLoading}
      onClick={handleSignIn}
      {...props}
    >
      <GithubLogo weight="fill" className="size-4" aria-hidden />
      {isLoading ? 'Redirecting to GitHub…' : 'Sign in with GitHub'}
    </Button>
  )
}
