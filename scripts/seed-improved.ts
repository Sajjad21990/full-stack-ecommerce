import { db } from '../db'
import { eq, sql } from 'drizzle-orm'
import { config } from 'dotenv'
// Direct imports to avoid circular dependencies
import { users, roles, permissions, userRoles, rolePermissions } from '../db/schema/auth'
import { customers, addresses } from '../db/schema/customers'
import { products, productOptions, optionValues, productVariants } from '../db/schema/products'
import { collections, productCollections, categories, productCategories } from '../db/schema/collections'
import { inventoryLocations, stockLevels } from '../db/schema/inventory'
import { discounts } from '../db/schema/discounts'
import { taxZones, taxRates, shippingZones, shippingRates } from '../db/schema/tax-shipping'
import bcrypt from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

const log = (message: string) => {
  console.log(`🌱 ${message}`)
}

const logSuccess = (message: string) => {
  console.log(`✅ ${message}`)
}

const logError = (message: string) => {
  console.error(`❌ ${message}`)
}

const logWarning = (message: string) => {
  console.warn(`⚠️  ${message}`)
}

// Custom error types for better error handling
class SeedError extends Error {
  constructor(message: string, public operation: string, public cause?: Error) {
    super(message)
    this.name = 'SeedError'
  }
}

class DuplicateDataError extends SeedError {
  constructor(operation: string, detail: string) {
    super(`Duplicate data detected during ${operation}: ${detail}`, operation)
    this.name = 'DuplicateDataError'
  }
}

// Helper function to handle database errors
function handleDbError(error: any, operation: string): never {
  if (error.code === '23505') { // Unique constraint violation
    const detail = error.detail || 'Unknown duplicate key'
    throw new DuplicateDataError(operation, detail)
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    throw new SeedError(`Foreign key constraint violation during ${operation}`, operation, error)
  }
  
  if (error.code === '42P01') { // Relation does not exist
    throw new SeedError(`Table does not exist during ${operation}. Run schema migration first.`, operation, error)
  }
  
  throw new SeedError(`Database error during ${operation}: ${error.message}`, operation, error)
}

// Transaction wrapper for atomic operations
async function withTransaction<T>(operation: string, fn: (tx: typeof db) => Promise<T>): Promise<T> {
  log(`Starting transaction: ${operation}`)
  
  return await db.transaction(async (tx) => {
    try {
      const result = await fn(tx)
      logSuccess(`Transaction completed: ${operation}`)
      return result
    } catch (error) {
      logError(`Transaction failed: ${operation}`)
      throw error
    }
  })
}

async function seedRolesAndPermissions(tx: typeof db = db) {
  log('Setting up roles and permissions...')

  try {
    // Check if permissions already exist
    const existingPermissions = await tx.select().from(permissions)
    let insertedPermissions = existingPermissions

    if (existingPermissions.length === 0) {
      log('Creating permissions...')
      // Define permissions
      const permissionsList = [
        { resource: 'products', action: 'create', description: 'Create products' },
        { resource: 'products', action: 'read', description: 'View products' },
        { resource: 'products', action: 'update', description: 'Update products' },
        { resource: 'products', action: 'delete', description: 'Delete products' },
        { resource: 'orders', action: 'create', description: 'Create orders' },
        { resource: 'orders', action: 'read', description: 'View orders' },
        { resource: 'orders', action: 'update', description: 'Update orders' },
        { resource: 'orders', action: 'delete', description: 'Delete orders' },
        { resource: 'customers', action: 'create', description: 'Create customers' },
        { resource: 'customers', action: 'read', description: 'View customers' },
        { resource: 'customers', action: 'update', description: 'Update customers' },
        { resource: 'customers', action: 'delete', description: 'Delete customers' },
        { resource: 'discounts', action: 'create', description: 'Create discounts' },
        { resource: 'discounts', action: 'read', description: 'View discounts' },
        { resource: 'discounts', action: 'update', description: 'Update discounts' },
        { resource: 'discounts', action: 'delete', description: 'Delete discounts' },
        { resource: 'analytics', action: 'read', description: 'View analytics' },
        { resource: 'settings', action: 'update', description: 'Update settings' },
      ]

      // Insert permissions
      insertedPermissions = await tx.insert(permissions).values(
        permissionsList.map(p => ({
          id: createId(),
          resource: p.resource,
          action: p.action,
          description: p.description,
        }))
      ).returning()
    } else {
      log('Permissions already exist, skipping creation')
    }

    // Check if roles already exist
    const existingRoles = await tx.select().from(roles)
    let insertedRoles = existingRoles

    if (existingRoles.length === 0) {
      log('Creating roles...')
      // Define roles
      const rolesList = [
        { name: 'admin', description: 'Full system access' },
        { name: 'manager', description: 'Store manager with most privileges' },
        { name: 'staff', description: 'Limited store staff access' },
        { name: 'customer', description: 'Customer account' },
      ]

      // Insert roles
      insertedRoles = await tx.insert(roles).values(
        rolesList.map(r => ({
          id: createId(),
          name: r.name,
          description: r.description,
        }))
      ).returning()
    } else {
      log('Roles already exist, skipping creation')
    }

    // Check if role permissions already exist
    const existingRolePermissions = await tx.select().from(rolePermissions)
    
    if (existingRolePermissions.length === 0) {
      log('Assigning permissions to roles...')
      // Assign permissions to roles
      const adminRole = insertedRoles.find(r => r.name === 'admin')!
      const managerRole = insertedRoles.find(r => r.name === 'manager')!
      const staffRole = insertedRoles.find(r => r.name === 'staff')!

      // Admin gets all permissions
      await tx.insert(rolePermissions).values(
        insertedPermissions.map(p => ({
          roleId: adminRole.id,
          permissionId: p.id,
        }))
      )

      // Manager gets most permissions except sensitive settings
      const managerPermissions = insertedPermissions.filter(p => 
        !(p.resource === 'settings' && p.action === 'update')
      )
      await tx.insert(rolePermissions).values(
        managerPermissions.map(p => ({
          roleId: managerRole.id,
          permissionId: p.id,
        }))
      )

      // Staff gets read permissions and basic operations
      const staffPermissions = insertedPermissions.filter(p => 
        p.action === 'read' || (p.resource === 'orders' && p.action === 'update')
      )
      await tx.insert(rolePermissions).values(
        staffPermissions.map(p => ({
          roleId: staffRole.id,
          permissionId: p.id,
        }))
      )
    } else {
      log('Role permissions already assigned, skipping')
    }

    logSuccess(`Setup complete: ${insertedRoles.length} roles and ${insertedPermissions.length} permissions`)
    return insertedRoles
  } catch (error) {
    handleDbError(error, 'roles and permissions setup')
  }
}

async function seedUsers(roles: typeof roles.$inferSelect[], tx: typeof db = db) {
  log('Creating admin user...')

  try {
    // Check if admin user already exists
    const existingAdmin = await tx.select().from(users).where(eq(users.email, 'admin@example.com'))
    
    if (existingAdmin.length > 0) {
      logSuccess('Admin user already exists: admin@example.com')
      return existingAdmin[0]
    }

    const adminRole = roles.find(r => r.name === 'admin')
    if (!adminRole) {
      throw new SeedError('Admin role not found', 'user creation')
    }

    const hashedPassword = await bcrypt.hash('admin123', 12) // Increased salt rounds

    const adminUser = await tx.insert(users).values({
      id: createId(),
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      password: hashedPassword,
      emailVerified: new Date(),
    }).returning()

    // Assign admin role
    await tx.insert(userRoles).values({
      userId: adminUser[0].id,
      roleId: adminRole.id,
    })

    logSuccess(`Created admin user: admin@example.com / admin123`)
    return adminUser[0]
  } catch (error) {
    handleDbError(error, 'user creation')
  }
}

async function seedInventoryLocations(tx: typeof db = db) {
  log('Creating inventory locations...')

  try {
    // Check if locations already exist
    const existing = await tx.select().from(inventoryLocations)
    if (existing.length > 0) {
      log('Inventory locations already exist, skipping creation')
      return existing
    }

    const locations = await tx.insert(inventoryLocations).values([
      {
        id: createId(),
        name: 'Main Warehouse',
        code: 'MAIN',
        type: 'warehouse',
        addressLine1: '123 Warehouse St',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'IN',
        isDefault: true,
      },
      {
        id: createId(),
        name: 'Delhi Store',
        code: 'DEL',
        type: 'store',
        addressLine1: '456 Store Ave',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'IN',
      },
    ]).returning()

    logSuccess(`Created ${locations.length} inventory locations`)
    return locations
  } catch (error) {
    handleDbError(error, 'inventory locations creation')
  }
}

async function seedTaxAndShipping(tx: typeof db = db) {
  log('Setting up tax zones and shipping...')

  try {
    // Check if tax zones already exist
    const existingTaxZones = await tx.select().from(taxZones)
    if (existingTaxZones.length > 0) {
      log('Tax and shipping configuration already exists, skipping creation')
      return
    }

    // Create tax zone for India
    const taxZone = await tx.insert(taxZones).values({
      id: createId(),
      name: 'India',
      description: 'Tax zone for India',
      isDefault: true,
      priceIncludesTax: false,
    }).returning()

    // GST tax rates
    await tx.insert(taxRates).values([
      {
        id: createId(),
        taxZoneId: taxZone[0].id,
        name: 'CGST',
        code: 'CGST',
        rate: 900, // 9%
      },
      {
        id: createId(),
        taxZoneId: taxZone[0].id,
        name: 'SGST',
        code: 'SGST', 
        rate: 900, // 9%
      },
    ])

    // Create shipping zone
    const shippingZone = await tx.insert(shippingZones).values({
      id: createId(),
      name: 'India',
      description: 'Shipping zone for India',
      isDefault: true,
    }).returning()

    // Shipping rates
    await tx.insert(shippingRates).values([
      {
        id: createId(),
        shippingZoneId: shippingZone[0].id,
        name: 'Standard Shipping',
        description: '5-7 business days',
        type: 'flat',
        price: 5000, // ₹50
        minDeliveryDays: 5,
        maxDeliveryDays: 7,
      },
      {
        id: createId(),
        shippingZoneId: shippingZone[0].id,
        name: 'Express Shipping',
        description: '2-3 business days',
        type: 'flat',
        price: 15000, // ₹150
        minDeliveryDays: 2,
        maxDeliveryDays: 3,
      },
      {
        id: createId(),
        shippingZoneId: shippingZone[0].id,
        name: 'Free Shipping',
        description: 'Free shipping on orders over ₹500',
        type: 'free',
        price: 0,
        minOrderValue: 50000, // ₹500
        minDeliveryDays: 5,
        maxDeliveryDays: 7,
      },
    ])

    logSuccess('Created tax and shipping configurations')
  } catch (error) {
    handleDbError(error, 'tax and shipping setup')
  }
}

async function seedCollections(tx: typeof db = db) {
  log('Creating collections...')

  try {
    // Check if collections already exist
    const existing = await tx.select().from(collections)
    if (existing.length > 0) {
      log('Collections already exist, skipping creation')
      return existing
    }

    const collections_data = await tx.insert(collections).values([
      {
        id: createId(),
        handle: 'featured',
        title: 'Featured Products',
        description: 'Our handpicked featured products',
        status: 'active',
        publishedAt: new Date(),
      },
      {
        id: createId(),
        handle: 'new-arrivals',
        title: 'New Arrivals',
        description: 'Latest products in our store',
        status: 'active',
        publishedAt: new Date(),
      },
      {
        id: createId(),
        handle: 'bestsellers',
        title: 'Best Sellers',
        description: 'Our most popular products',
        status: 'active',
        publishedAt: new Date(),
      },
    ]).returning()

    logSuccess(`Created ${collections_data.length} collections`)
    return collections_data
  } catch (error) {
    handleDbError(error, 'collections creation')
  }
}

async function seedCategories(tx: typeof db = db) {
  log('Creating categories...')

  try {
    // Check if categories already exist
    const existing = await tx.select().from(categories)
    if (existing.length > 0) {
      log('Categories already exist, skipping creation')
      return existing
    }

    const categories_data = await tx.insert(categories).values([
      {
        id: createId(),
        handle: 'electronics',
        name: 'Electronics',
        path: '/electronics',
        level: 0,
      },
      {
        id: createId(),
        handle: 'clothing',
        name: 'Clothing',
        path: '/clothing',
        level: 0,
      },
      {
        id: createId(),
        handle: 'home-garden',
        name: 'Home & Garden',
        path: '/home-garden',
        level: 0,
      },
    ]).returning()

    logSuccess(`Created ${categories_data.length} categories`)
    return categories_data
  } catch (error) {
    handleDbError(error, 'categories creation')
  }
}

async function seedDiscounts(tx: typeof db = db) {
  log('Creating sample discounts...')

  try {
    // Check if discounts already exist
    const existing = await tx.select().from(discounts)
    if (existing.length > 0) {
      log('Discounts already exist, skipping creation')
      return
    }

    await tx.insert(discounts).values([
      {
        id: createId(),
        code: 'WELCOME10',
        title: 'Welcome Discount',
        description: '10% off for new customers',
        type: 'percentage',
        value: 1000, // 10%
        status: 'active',
        usageLimit: 100,
        oncePerCustomer: true,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      {
        id: createId(),
        code: 'FREESHIP',
        title: 'Free Shipping',
        description: 'Free shipping on all orders',
        type: 'free_shipping',
        value: 0,
        status: 'active',
        minimumAmount: 50000, // ₹500
        startsAt: new Date(),
      },
    ])

    logSuccess('Created sample discount codes')
  } catch (error) {
    handleDbError(error, 'discounts creation')
  }
}

// Validate environment and database connection
async function validateEnvironment() {
  log('Validating environment...')
  
  if (!process.env.DATABASE_URL) {
    throw new SeedError('DATABASE_URL is required in environment variables', 'environment validation')
  }
  
  try {
    await db.execute(sql`SELECT 1`)
    logSuccess('Database connection validated')
  } catch (error) {
    throw new SeedError('Database connection failed', 'environment validation', error as Error)
  }
}

async function main() {
  try {
    log('Starting improved comprehensive seed...')
    
    // Validate environment first
    await validateEnvironment()
    
    // Run all seed operations in a single transaction
    await withTransaction('comprehensive seed', async (tx) => {
      const roles = await seedRolesAndPermissions(tx)
      await seedUsers(roles, tx)
      const locations = await seedInventoryLocations(tx)
      await seedTaxAndShipping(tx)
      const collections_data = await seedCollections(tx)
      const categories_data = await seedCategories(tx)
      await seedDiscounts(tx)
      
      return { roles, locations, collections_data, categories_data }
    })
    
    logSuccess('✨ Improved seed completed successfully!')
    logSuccess('🎯 Ready to start building your e-commerce platform!')
    logSuccess('')
    logSuccess('📋 What was created:')
    logSuccess('  • Admin user: admin@example.com / admin123')
    logSuccess('  • RBAC system with roles and permissions')
    logSuccess('  • 3 collections and 3 categories')
    logSuccess('  • Tax zones and shipping rates for India')
    logSuccess('  • Sample discount codes')
    logSuccess('  • Inventory locations')
    logSuccess('')
    logSuccess('🔧 Next steps:')
    logSuccess('  • Run: npm run db:validate to verify the setup')
    logSuccess('  • Run: npm run dev to start the development server')
    logSuccess('  • Visit: http://localhost:3000/admin to test admin login')
    
  } catch (error) {
    if (error instanceof DuplicateDataError) {
      logWarning(`Duplicate data detected: ${error.message}`)
      logWarning('This is expected if you\'ve already seeded the database')
      logSuccess('✨ Seed validation completed - database already populated!')
    } else if (error instanceof SeedError) {
      logError(`Seed failed in ${error.operation}: ${error.message}`)
      if (error.cause) {
        logError(`Underlying cause: ${error.cause.message}`)
      }
      process.exit(1)
    } else {
      logError('Unexpected error during seed:')
      console.error(error)
      process.exit(1)
    }
  } finally {
    process.exit(0)
  }
}

main()