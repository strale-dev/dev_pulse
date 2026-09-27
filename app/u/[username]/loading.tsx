import { PublicProfileSkeleton } from '@/components/profile/public-profile-skeleton'
import { PublicProfileShell } from '@/components/profile/public-profile-shell'

export default function PublicProfileLoading() {
  return (
    <PublicProfileShell signedIn={false}>
      <PublicProfileSkeleton />
    </PublicProfileShell>
  )
}
