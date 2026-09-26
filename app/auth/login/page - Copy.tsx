import { GitHubSignInButton } from '@/components/github-sign-in-button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <p className="font-heading text-sm font-medium tracking-wide text-primary">DevPulse</p>
            <CardTitle className="font-heading text-2xl">Sign in</CardTitle>
            <CardDescription>
              Connect your GitHub account to open your developer analytics dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <GitHubSignInButton className="w-full" size="lg" />
            <p className="text-center text-xs text-muted-foreground">
              We request public profile and email scopes only — no private repository access.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
