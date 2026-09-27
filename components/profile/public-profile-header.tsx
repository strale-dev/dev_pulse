import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { PublicProfileIdentity } from '@/lib/profile/load-public-profile'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'DP'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

export function PublicProfileHeader({
  profile,
}: {
  profile: PublicProfileIdentity
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <Avatar className="size-20" size="lg">
        {profile.avatarUrl ? (
          <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
        ) : null}
        <AvatarFallback className="text-lg">{initials(profile.displayName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground">
            {profile.displayName}
          </h1>
          {!profile.isPublic && profile.isOwner ? (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              Only you can see this
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">@{profile.githubLogin}</p>
        {profile.bio ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/90">{profile.bio}</p>
        ) : null}
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <div>
            <dt className="inline text-muted-foreground">Followers </dt>
            <dd className="inline tabular-nums text-foreground">
              {(profile.followers ?? 0).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">Following </dt>
            <dd className="inline tabular-nums text-foreground">
              {(profile.following ?? 0).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">Public repos </dt>
            <dd className="inline tabular-nums text-foreground">
              {(profile.publicRepos ?? 0).toLocaleString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
