import Link from 'next/link'

import { GitHubSignInButton } from '@/components/github-sign-in-button'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function formatError(raw: string | undefined) {
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const detail = formatError(params.error)

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-2xl">Sign-in did not complete</CardTitle>
            <CardDescription>
              GitHub authorization failed or we could not finish setting up your session. You can
              try again — no changes were made to your DevPulse account unless sign-in succeeded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detail ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                {detail}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                If this keeps happening, check that GitHub OAuth is configured in Supabase and that
                your callback URL matches this environment.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <GitHubSignInButton className="w-full sm:w-auto" />
            <Link
              href="/"
              className={buttonVariants({ variant: 'outline', className: 'w-full sm:w-auto' })}
            >
              Back to home
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
