import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Detect if we're in Railway build environment
// During build: RAILWAY_ENVIRONMENT exists but app is not yet deployed
// During runtime: App is deployed and internal URL works
const isRailwayBuild =
  process.env.RAILWAY_ENVIRONMENT && !process.env.RAILWAY_DEPLOYMENT_ID

// Railway provides two database URLs:
// - DATABASE_URL: Internal URL (no egress fees, only works at runtime)
// - DATABASE_PUBLIC_URL: Public URL (works during build, incurs egress fees)
//
// Strategy: Use public URL only during build, internal URL at runtime
const connectionString = isRailwayBuild
  ? process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL
  : process.env.DATABASE_URL

if (isRailwayBuild && process.env.DATABASE_PUBLIC_URL) {
  console.log('🔨 Build phase: Using DATABASE_PUBLIC_URL for static generation')
} else if (isRailwayBuild) {
  console.log(
    '⚠️ Build phase: DATABASE_PUBLIC_URL not found, build may fail for static pages'
  )
}

// Create client only if a connection string is available
let db: ReturnType<typeof drizzle>

// Function to initialize database connection
function initializeDatabase() {
  if (connectionString && !connectionString.includes('undefined')) {
    try {
      const client = postgres(connectionString!, {
        max: process.env.NODE_ENV === 'production' ? 10 : 1,
        ssl:
          process.env.NODE_ENV === 'production' &&
          !connectionString.includes('localhost')
            ? 'require'
            : undefined,
        idle_timeout: 20,
        connect_timeout: 10,
      })

      return drizzle(client, { schema })
    } catch (error) {
      console.error('Database connection error:', error)
      return null
    }
  }
  return null
}

// Initialize database
const initializedDb = initializeDatabase()

if (initializedDb) {
  db = initializedDb
} else {
  // Create a mock db object for build time or when connection fails
  console.warn('⚠️ No database connection available, using mock db')
  db = {} as any
}

export { db }

// Export schema for external use
export * from './schema'

// Export database types
export type Database = typeof db
