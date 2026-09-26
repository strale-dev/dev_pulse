import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

const url = process.env.DIRECT_URL
if (!url) {
  throw new Error(
    'DIRECT_URL is required for drizzle-kit (push, studio, introspect). Add the Supabase direct (session) connection string to .env.local.',
  )
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  schemaFilter: ['public'],
  dbCredentials: {
    url,
    ssl: { rejectUnauthorized: false },
  },
})
