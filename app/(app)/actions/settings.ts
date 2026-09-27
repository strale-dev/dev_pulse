'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { db } from '@/lib/db'
import { profiles } from '@/lib/db/schema'
import { createClient } from '@/lib/server'

async function requireUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  return user.id
}

export async function updatePublicProfile(isPublic: boolean): Promise<{
  ok: true
} | { ok: false; error: string }> {
  const userId = await requireUserId()

  try {
    const updated = await db
      .update(profiles)
      .set({ isPublic })
      .where(eq(profiles.userId, userId))
      .returning({ githubLogin: profiles.githubLogin })

    const login = updated[0]?.githubLogin
    revalidatePath('/settings')
    if (login) {
      revalidatePath(`/u/${login}`)
      revalidatePath(`/u/${login}/opengraph-image`)
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not update public profile. Please try again.' }
  }
}
