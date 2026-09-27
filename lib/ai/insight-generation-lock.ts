import 'server-only'

import { Pool, type PoolClient } from 'pg'

let lockPool: Pool | null = null

function getInsightLockPool(): Pool {
  if (!lockPool) {
    const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL
    if (!url) {
      throw new Error('Missing DIRECT_URL or DATABASE_URL for insight generation lock')
    }
    lockPool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 4,
    })
  }
  return lockPool
}

export type InsightGenerationLock = {
  release: () => Promise<void>
}

export async function tryAcquireInsightGenerationLock(
  userId: string,
): Promise<InsightGenerationLock | null> {
  const client = await getInsightLockPool().connect()
  try {
    const result = await client.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock(hashtext($1::text)) AS acquired',
      [userId],
    )
    const acquired = result.rows[0]?.acquired === true
    if (!acquired) {
      client.release()
      return null
    }
    return createLockHandle(client, userId)
  } catch (error) {
    client.release()
    throw error
  }
}

function createLockHandle(client: PoolClient, userId: string): InsightGenerationLock {
  let released = false

  const release = async () => {
    if (released) return
    released = true
    try {
      await client.query('SELECT pg_advisory_unlock(hashtext($1::text))', [userId])
    } finally {
      client.release()
    }
  }

  return { release }
}

/** Test helper — clears a stuck session lock for one user. */
export async function forceReleaseInsightGenerationLock(userId: string): Promise<void> {
  const client = await getInsightLockPool().connect()
  try {
    await client.query('SELECT pg_advisory_unlock(hashtext($1::text))', [userId])
  } finally {
    client.release()
  }
}
