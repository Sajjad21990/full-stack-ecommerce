import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Railway provides DATABASE_URL with internal hostname during runtime
// During build, we need to handle database connection differently
const connectionString = process.env.DATABASE_URL!

// Create client only if DATABASE_URL is available
// This prevents build errors when database isn't accessible during static generation
let db: ReturnType<typeof drizzle>

if (connectionString && !connectionString.includes('undefined')) {
  try {
    const client = postgres(connectionString, {
      max: process.env.NODE_ENV === 'production' ? 10 : 1,
      ssl:
        process.env.NODE_ENV === 'production' &&
        !connectionString.includes('localhost')
          ? 'require'
          : undefined,
      idle_timeout: 20,
      connect_timeout: 10,
    })

    db = drizzle(client, { schema })
  } catch (error) {
    console.error('Database connection error:', error)
    // Create a mock db object for build time
    db = {} as any
  }
} else {
  // Mock db for build time
  db = {} as any
}

export { db }

// Export schema for external use
export * from './schema'

// Export database types
export type Database = typeof db
