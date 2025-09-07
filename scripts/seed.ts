import { db } from '../db'
import { eq } from 'drizzle-orm'
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
import * as dotenv from 'dotenv'

dotenv.config()

const log = (message: string) => {
  console.log(`🌱 ${message}`)
}

const logSuccess = (message: string) => {
  console.log(`✅ ${message}`)
}

const logError = (message: string) => {
  console.error(`❌ ${message}`)
}

async function seedRolesAndPermissions() {
  log('Setting up roles and permissions...')

  // Check if permissions already exist
  const existingPermissions = await db.select().from(permissions)
  let insertedPermissions = existingPermissions

  if (existingPermissions.length === 0) {
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
    insertedPermissions = await db.insert(permissions).values(
      permissionsList.map(p => ({
        id: createId(),
        resource: p.resource,
        action: p.action,
        description: p.description,
      }))
    ).returning()
  }

  // Check if roles already exist
  const existingRoles = await db.select().from(roles)
  let insertedRoles = existingRoles

  if (existingRoles.length === 0) {
    // Define roles
    const rolesList = [
      { name: 'admin', description: 'Full system access' },
      { name: 'manager', description: 'Store manager with most privileges' },
      { name: 'staff', description: 'Limited store staff access' },
      { name: 'customer', description: 'Customer account' },
    ]

    // Insert roles
    insertedRoles = await db.insert(roles).values(
      rolesList.map(r => ({
        id: createId(),
        name: r.name,
        description: r.description,
      }))
    ).returning()
  }

  // Check if role permissions already exist
  const existingRolePermissions = await db.select().from(rolePermissions)
  
  if (existingRolePermissions.length === 0) {
    // Assign permissions to roles
    const adminRole = insertedRoles.find(r => r.name === 'admin')!
    const managerRole = insertedRoles.find(r => r.name === 'manager')!
    const staffRole = insertedRoles.find(r => r.name === 'staff')!

    // Admin gets all permissions
    await db.insert(rolePermissions).values(
      insertedPermissions.map(p => ({
        roleId: adminRole.id,
        permissionId: p.id,
      }))
    )

    // Manager gets most permissions except sensitive settings
    const managerPermissions = insertedPermissions.filter(p => 
      !(p.resource === 'settings' && p.action === 'update')
    )
    await db.insert(rolePermissions).values(
      managerPermissions.map(p => ({
        roleId: managerRole.id,
        permissionId: p.id,
      }))
    )

    // Staff gets read permissions and basic operations
    const staffPermissions = insertedPermissions.filter(p => 
      p.action === 'read' || (p.resource === 'orders' && p.action === 'update')
    )
    await db.insert(rolePermissions).values(
      staffPermissions.map(p => ({
        roleId: staffRole.id,
        permissionId: p.id,
      }))
    )
  }

  logSuccess(`Setup complete: ${insertedRoles.length} roles and ${insertedPermissions.length} permissions`)
  return insertedRoles
}

async function seedUsers(roles: typeof roles.$inferSelect[]) {
  log('Creating admin user...')

  // Check if admin user already exists
  const existingAdmin = await db.select().from(users).where(eq(users.email, 'admin@example.com'))
  
  if (existingAdmin.length > 0) {
    logSuccess('Admin user already exists: admin@example.com')
    return existingAdmin[0]
  }

  const adminRole = roles.find(r => r.name === 'admin')!
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const adminUser = await db.insert(users).values({
    id: createId(),
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    password: hashedPassword,
    emailVerified: new Date(),
  }).returning()

  // Assign admin role
  await db.insert(userRoles).values({
    userId: adminUser[0].id,
    roleId: adminRole.id,
  })

  logSuccess(`Created admin user: admin@example.com / admin123`)
  return adminUser[0]
}

async function seedInventoryLocations() {
  log('Creating inventory locations...')

  const locations = await db.insert(inventoryLocations).values([
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
}

async function seedTaxAndShipping() {
  log('Setting up tax zones and shipping...')

  // Create tax zone for India
  const taxZone = await db.insert(taxZones).values({
    id: createId(),
    name: 'India',
    description: 'Tax zone for India',
    isDefault: true,
    priceIncludesTax: false,
  }).returning()

  // GST tax rates
  await db.insert(taxRates).values([
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
  const shippingZone = await db.insert(shippingZones).values({
    id: createId(),
    name: 'India',
    description: 'Shipping zone for India',
    isDefault: true,
  }).returning()

  // Shipping rates
  await db.insert(shippingRates).values([
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
}

async function seedCollections() {
  log('Creating collections...')

  const collections_data = await db.insert(collections).values([
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
}

async function seedCategories() {
  log('Creating categories...')

  const categories_data = await db.insert(categories).values([
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
}

async function seedProducts(collections_data: any[], categories_data: any[], locations: any[]) {
  log('Creating products with variants...')

  const mainLocation = locations.find(l => l.isDefault)!
  const electronicsCategory = categories_data.find(c => c.handle === 'electronics')!
  const clothingCategory = categories_data.find(c => c.handle === 'clothing')!
  const featuredCollection = collections_data.find(c => c.handle === 'featured')!
  
  // Product 1: Smartphone
  const smartphone = await db.insert(products).values({
    id: createId(),
    handle: 'smartphone-pro',
    title: 'Smartphone Pro',
    description: 'Latest smartphone with advanced features',
    status: 'active',
    vendor: 'TechCorp',
    productType: 'Electronics',
    price: 4999900, // ₹49,999
    publishedAt: new Date(),
  }).returning()

  // Add to category and collection
  await db.insert(productCategories).values({
    productId: smartphone[0].id,
    categoryId: electronicsCategory.id,
    isPrimary: true,
  })

  await db.insert(productCollections).values({
    productId: smartphone[0].id,
    collectionId: featuredCollection.id,
  })

  // Create options for smartphone
  const colorOption = await db.insert(productOptions).values({
    id: createId(),
    productId: smartphone[0].id,
    name: 'Color',
    position: 1,
  }).returning()

  const storageOption = await db.insert(productOptions).values({
    id: createId(),
    productId: smartphone[0].id,
    name: 'Storage',
    position: 2,
  }).returning()

  // Create option values
  const colorValues = await db.insert(optionValues).values([
    { id: createId(), optionId: colorOption[0].id, value: 'Black', position: 1 },
    { id: createId(), optionId: colorOption[0].id, value: 'White', position: 2 },
    { id: createId(), optionId: colorOption[0].id, value: 'Blue', position: 3 },
  ]).returning()

  const storageValues = await db.insert(optionValues).values([
    { id: createId(), optionId: storageOption[0].id, value: '128GB', position: 1 },
    { id: createId(), optionId: storageOption[0].id, value: '256GB', position: 2 },
  ]).returning()

  // Create variants
  const variants = []
  for (const color of colorValues) {
    for (const storage of storageValues) {
      const price = storage.value === '256GB' ? 5499900 : 4999900 // Higher price for 256GB
      
      const variant = await db.insert(productVariants).values({
        id: createId(),
        productId: smartphone[0].id,
        title: `${color.value} / ${storage.value}`,
        sku: `PHONE-${color.value.toUpperCase()}-${storage.value}`,
        option1: color.value,
        option2: storage.value,
        price,
        inventoryQuantity: 50,
      }).returning()

      // Add stock level
      await db.insert(stockLevels).values({
        id: createId(),
        variantId: variant[0].id,
        locationId: mainLocation.id,
        quantity: 50,
      })

      variants.push(variant[0])
    }
  }

  // Product 2: T-Shirt
  const tshirt = await db.insert(products).values({
    id: createId(),
    handle: 'cotton-tshirt',
    title: 'Premium Cotton T-Shirt',
    description: 'Comfortable cotton t-shirt for everyday wear',
    status: 'active',
    vendor: 'FashionBrand',
    productType: 'Apparel',
    price: 199900, // ₹1,999
    publishedAt: new Date(),
  }).returning()

  await db.insert(productCategories).values({
    productId: tshirt[0].id,
    categoryId: clothingCategory.id,
    isPrimary: true,
  })

  // T-shirt options
  const sizeOption = await db.insert(productOptions).values({
    id: createId(),
    productId: tshirt[0].id,
    name: 'Size',
    position: 1,
  }).returning()

  const tshirtColorOption = await db.insert(productOptions).values({
    id: createId(),
    productId: tshirt[0].id,
    name: 'Color',
    position: 2,
  }).returning()

  const sizeValues = await db.insert(optionValues).values([
    { id: createId(), optionId: sizeOption[0].id, value: 'S', position: 1 },
    { id: createId(), optionId: sizeOption[0].id, value: 'M', position: 2 },
    { id: createId(), optionId: sizeOption[0].id, value: 'L', position: 3 },
    { id: createId(), optionId: sizeOption[0].id, value: 'XL', position: 4 },
  ]).returning()

  const tshirtColorValues = await db.insert(optionValues).values([
    { id: createId(), optionId: tshirtColorOption[0].id, value: 'Red', position: 1 },
    { id: createId(), optionId: tshirtColorOption[0].id, value: 'Blue', position: 2 },
    { id: createId(), optionId: tshirtColorOption[0].id, value: 'Green', position: 3 },
  ]).returning()

  // Create t-shirt variants
  for (const size of sizeValues) {
    for (const color of tshirtColorValues) {
      const variant = await db.insert(productVariants).values({
        id: createId(),
        productId: tshirt[0].id,
        title: `${size.value} / ${color.value}`,
        sku: `TSHIRT-${size.value}-${color.value.toUpperCase()}`,
        option1: size.value,
        option2: color.value,
        price: 199900,
        inventoryQuantity: 25,
      }).returning()

      await db.insert(stockLevels).values({
        id: createId(),
        variantId: variant[0].id,
        locationId: mainLocation.id,
        quantity: 25,
      })
    }
  }

  logSuccess('Created 2 products with variants and inventory')
}

async function seedDiscounts() {
  log('Creating sample discounts...')

  await db.insert(discounts).values([
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
}

async function main() {
  try {
    log('Starting comprehensive seed...')
    
    const roles = await seedRolesAndPermissions()
    await seedUsers(roles)
    const locations = await seedInventoryLocations()
    await seedTaxAndShipping()
    const collections_data = await seedCollections()
    const categories_data = await seedCategories()
    await seedProducts(collections_data, categories_data, locations)
    await seedDiscounts()
    
    logSuccess('✨ Seed completed successfully!')
    logSuccess('🎯 Ready to start building your e-commerce platform!')
    logSuccess('')
    logSuccess('📋 What was created:')
    logSuccess('  • Admin user: admin@example.com / admin123')
    logSuccess('  • RBAC system with roles and permissions')
    logSuccess('  • 2 sample products with variants and inventory')
    logSuccess('  • 3 collections and 3 categories')
    logSuccess('  • Tax zones and shipping rates for India')
    logSuccess('  • Sample discount codes')
    logSuccess('  • Inventory locations')
    
  } catch (error) {
    logError('Seed failed:')
    console.error(error)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

main()