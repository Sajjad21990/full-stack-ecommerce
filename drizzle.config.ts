import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

// Load environment variables with fallback support
config({ path: '.env.local' })
config({ path: '.env' })

// Validate required environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in environment variables')
}

export default defineConfig({
  schema: './db/schema/**/*.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
})