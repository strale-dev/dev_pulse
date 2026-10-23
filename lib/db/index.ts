import 'server-only'

import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'
import { resolveDatabaseUrl } from './resolve-database-url'

const url = resolveDatabaseUrl()

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
})

export const db = drizzle(pool, { schema })
