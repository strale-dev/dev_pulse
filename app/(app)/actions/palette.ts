'use server'

import { and, desc, eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { db } from '@/lib/db'
import { repositories } from '@/lib/db/schema'
import { createClient } from '@/lib/server'

export type PaletteRepo = {
  name: string
  htmlUrl: string
}

export async function listPaletteRepos(): Promise<PaletteRepo[]> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  const rows = await db
    .select({
      name: repositories.name,
      htmlUrl: repositories.htmlUrl,
    })
    .from(repositories)
    .where(and(eq(repositories.userId, user.id), eq(repositories.isPrivate, false)))
    .orderBy(desc(repositories.stargazersCount))
    .limit(80)

  return rows
}
