import 'server-only'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('Missing DATABASE_URL')
}

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
})

export const db = drizzle(pool, { schema })
