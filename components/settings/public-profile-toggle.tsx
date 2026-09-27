'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { updatePublicProfile } from '@/app/(app)/actions/settings'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function PublicProfileToggle({
  isPublic: isPublicFromServer,
  profilePath,
}: {
  isPublic: boolean
  profilePath: string | null
}) {
  const [isPublic, setIsPublic] = useState(isPublicFromServer)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setIsPublic(isPublicFromServer)
  }, [isPublicFromServer])

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <Label htmlFor="public-profile" className="text-sm text-foreground">
          Public profile
        </Label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          When on, anyone can view your DevPulse page
          {profilePath ? (
            <>
              {' '}
              at <span className="font-medium text-foreground">{profilePath}</span>
            </>
          ) : (
            '.'
          )}
          . When off, other people see a 404.
        </p>
      </div>
      <Switch
        id="public-profile"
        checked={isPublic}
        disabled={pending}
        onCheckedChange={(checked) => {
          const previous = isPublic
          setIsPublic(checked)
          startTransition(async () => {
            const result = await updatePublicProfile(checked)
            if (!result.ok) {
              setIsPublic(previous)
              toast.error(result.error)
            }
          })
        }}
      />
    </div>
  )
}
