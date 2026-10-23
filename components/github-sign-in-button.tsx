'use client'

import { GithubLogo } from '@phosphor-icons/react'
import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type GitHubSignInButtonProps = {
  className?: string
  nextPath?: string
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'
}

export function GitHubSignInButton({
  className,
  nextPath = '/dashboard',
  size = 'default',
  variant = 'default',
}: GitHubSignInButtonProps) {
  const href = `/auth/github?next=${encodeURIComponent(nextPath)}`

  return (
    <Link
      href={href}
      className={cn(buttonVariants({ size, variant }), 'gap-2', className)}
    >
      <GithubLogo weight="fill" className="size-4" aria-hidden />
      Sign in with GitHub
    </Link>
  )
}
