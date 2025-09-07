import { db } from '../db'
import { users } from '../db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import * as dotenv from 'dotenv'

dotenv.config()

async function seedAdmin() {
  try {
    console.log('🌱 Seeding admin user...')

    const adminEmail = 'admin@example.com'
    const adminPassword = 'admin123' // Simple password for development

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1)

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists')
      return
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    // Create admin user
    await db.insert(users).values({
      id: crypto.randomUUID(),
      email: adminEmail,
      name: 'Admin User',
      role: 'admin',
      password: hashedPassword,
      emailVerified: new Date(),
    })

    console.log('✅ Admin user created successfully!')
    console.log('📧 Email: admin@example.com')
    console.log('🔑 Password: admin123')
    console.log('\n⚠️  Please change the password after first login!')
  } catch (error) {
    console.error('❌ Error seeding admin:', error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

seedAdmin()