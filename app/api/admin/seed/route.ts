import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Simple security check - only allow in development or with a secret key
    const authHeader = request.headers.get('authorization')
    const expectedAuth = process.env.ADMIN_SEED_SECRET || 'admin-seed-123'

    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Import and run the seeding script
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    console.log('🌱 Starting database seeding via API...')

    const { stdout, stderr } = await execAsync('npm run db:seed-improved', {
      cwd: process.cwd(),
      env: process.env,
    })

    console.log('Seed stdout:', stdout)
    if (stderr) console.log('Seed stderr:', stderr)

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      logs: stdout,
    })
  } catch (error: any) {
    console.error('Seeding failed:', error)
    return NextResponse.json(
      {
        error: 'Seeding failed',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST method with Authorization header to seed database',
  })
}
