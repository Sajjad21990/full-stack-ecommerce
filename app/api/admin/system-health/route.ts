import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { mediaFolders } from '@/db/schema/folders'
import { requireAdmin } from '@/lib/auth'
import { isFirebaseConfigured } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    await requireAdmin()

    const healthChecks = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      railway: !!process.env.RAILWAY_ENVIRONMENT,
      databaseUrl: !!process.env.DATABASE_URL,
      firebase: isFirebaseConfigured(),
      checks: {
        database: { status: 'unknown', error: null, responseTime: 0 },
        mediaFoldersTable: { status: 'unknown', error: null, count: 0 },
      },
    }

    // Test database connection
    const dbStart = Date.now()
    try {
      await db.execute('SELECT 1 as test')
      healthChecks.checks.database.status = 'healthy'
      healthChecks.checks.database.responseTime = Date.now() - dbStart
    } catch (error) {
      healthChecks.checks.database.status = 'error'
      healthChecks.checks.database.error = {
        message: error.message,
        code: error.code,
        name: error.name,
      }
      healthChecks.checks.database.responseTime = Date.now() - dbStart
    }

    // Test media folders table
    try {
      const result = await db.select().from(mediaFolders).limit(1)
      healthChecks.checks.mediaFoldersTable.status = 'healthy'
      healthChecks.checks.mediaFoldersTable.count = result.length
    } catch (error) {
      healthChecks.checks.mediaFoldersTable.status = 'error'
      healthChecks.checks.mediaFoldersTable.error = {
        message: error.message,
        code: error.code,
        name: error.name,
      }
    }

    return NextResponse.json(healthChecks)
  } catch (error) {
    console.error('[system-health] Health check failed:', error)

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: {
          message: error.message,
          name: error.name,
        },
      },
      { status: 500 }
    )
  }
}
