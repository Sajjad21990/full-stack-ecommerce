import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import {
  users,
  roles,
  permissions,
  userRoles,
  rolePermissions,
} from '@/db/schema/auth'
import bcrypt from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    // Simple security check
    const authHeader = request.headers.get('authorization')
    const expectedAuth = process.env.ADMIN_SEED_SECRET || 'admin-seed-123'

    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🌱 Starting basic admin seeding...')

    // Create admin role
    console.log('📦 Creating admin role...')
    const [adminRole] = await db
      .insert(roles)
      .values({
        id: createId(),
        name: 'admin',
        description: 'Administrator role with full access',
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning()

    // Create basic permissions
    console.log('🔑 Creating basic permissions...')
    const permissionsList = [
      { resource: 'users', action: 'create', description: 'Create users' },
      { resource: 'users', action: 'read', description: 'Read users' },
      { resource: 'users', action: 'update', description: 'Update users' },
      { resource: 'users', action: 'delete', description: 'Delete users' },
      {
        resource: 'products',
        action: 'create',
        description: 'Create products',
      },
      { resource: 'products', action: 'read', description: 'Read products' },
      {
        resource: 'products',
        action: 'update',
        description: 'Update products',
      },
      {
        resource: 'products',
        action: 'delete',
        description: 'Delete products',
      },
      { resource: 'orders', action: 'read', description: 'Read orders' },
      { resource: 'orders', action: 'update', description: 'Update orders' },
    ]

    const createdPermissions = await db
      .insert(permissions)
      .values(
        permissionsList.map((p) => ({
          id: createId(),
          resource: p.resource,
          action: p.action,
          description: p.description,
          createdAt: new Date(),
        }))
      )
      .onConflictDoNothing()
      .returning()

    // Assign all permissions to admin role
    if (adminRole && createdPermissions.length > 0) {
      console.log('🔗 Assigning permissions to admin role...')
      await db
        .insert(rolePermissions)
        .values(
          createdPermissions.map((permission) => ({
            id: createId(),
            roleId: adminRole.id,
            permissionId: permission.id,
            createdAt: new Date(),
          }))
        )
        .onConflictDoNothing()
    }

    // Create admin user
    console.log('👤 Creating admin user...')
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    const [adminUser] = await db
      .insert(users)
      .values({
        id: createId(),
        email: adminEmail,
        name: 'Admin User',
        passwordHash: hashedPassword,
        emailVerified: new Date(),
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning()

    // Assign admin role to admin user
    if (adminUser && adminRole) {
      console.log('🔗 Assigning admin role to user...')
      await db
        .insert(userRoles)
        .values({
          id: createId(),
          userId: adminUser.id,
          roleId: adminRole.id,
          createdAt: new Date(),
        })
        .onConflictDoNothing()
    }

    console.log('✅ Basic admin setup completed!')

    return NextResponse.json({
      success: true,
      message: 'Basic admin setup completed successfully',
      adminCredentials: {
        email: adminEmail,
        password: 'Check your environment variables',
      },
    })
  } catch (error: any) {
    console.error('Basic seeding failed:', error)
    return NextResponse.json(
      {
        error: 'Basic seeding failed',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      'Use POST method with Authorization header to seed basic admin data',
  })
}
