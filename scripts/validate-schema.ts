import { db } from '../db'
import { sql } from 'drizzle-orm'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

const log = (message: string) => {
  console.log(`🔍 ${message}`)
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

// Required tables for e-commerce platform
const REQUIRED_TABLES = [
  // Auth & Users
  'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
  'accounts', 'sessions', 'verification_tokens',
  
  // Customers
  'customers', 'addresses',
  
  // Products
  'products', 'product_options', 'option_values', 'product_variants',
  'collections', 'product_collections', 'categories', 'product_categories',
  
  // Inventory
  'inventory_locations', 'stock_levels',
  
  // Orders & Cart
  'carts', 'cart_items', 'orders', 'order_items', 'payments', 'refunds',
  'shipments', 'returns',
  
  // Discounts & Tax
  'discounts', 'gift_cards', 'tax_zones', 'tax_rates', 
  'shipping_zones', 'shipping_rates',
  
  // Media & System
  'media_assets', 'metafields', 'webhooks', 'audit_logs'
]

// Required columns for critical tables
const REQUIRED_COLUMNS = {
  users: ['id', 'email', 'password', 'role'],
  products: ['id', 'handle', 'title', 'status', 'price'],
  orders: ['id', 'customer_id', 'status', 'total_amount'],
  payments: ['id', 'order_id', 'amount', 'status'],
}

async function validateDatabaseConnection() {
  log('Validating database connection...')
  try {
    await db.execute(sql`SELECT 1`)
    logSuccess('Database connection successful')
    return true
  } catch (error) {
    logError(`Database connection failed: ${error}`)
    return false
  }
}

async function validateTables() {
  log('Validating table structure...')
  
  try {
    // Get all tables in the database
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)
    
    const existingTables = result.map((row: any) => row.table_name)
    
    let missingTables: string[] = []
    let foundTables = 0
    
    for (const table of REQUIRED_TABLES) {
      if (existingTables.includes(table)) {
        foundTables++
      } else {
        missingTables.push(table)
      }
    }
    
    logSuccess(`Found ${foundTables}/${REQUIRED_TABLES.length} required tables`)
    
    if (missingTables.length > 0) {
      logWarning(`Missing tables: ${missingTables.join(', ')}`)
      return false
    }
    
    return true
  } catch (error) {
    logError(`Table validation failed: ${error}`)
    return false
  }
}

async function validateColumns() {
  log('Validating critical table columns...')
  
  let allColumnsValid = true
  
  for (const [tableName, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
    try {
      const result = await db.execute(sql.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' AND table_schema = 'public'
      `))
      
      const existingColumns = result.map((row: any) => row.column_name)
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
      
      if (missingColumns.length > 0) {
        logError(`Table '${tableName}' missing columns: ${missingColumns.join(', ')}`)
        allColumnsValid = false
      } else {
        logSuccess(`Table '${tableName}' has all required columns`)
      }
    } catch (error) {
      logError(`Failed to validate columns for table '${tableName}': ${error}`)
      allColumnsValid = false
    }
  }
  
  return allColumnsValid
}

async function validateIndexes() {
  log('Validating database indexes...')
  
  try {
    const result = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `)
    
    const indexes = result as any[]
    const criticalIndexes = [
      'users_email_idx',
      'products_handle_idx',
      'orders_customer_id_idx',
      'permissions_resource_action_idx'
    ]
    
    const existingIndexNames = indexes.map(idx => idx.indexname)
    const foundCritical = criticalIndexes.filter(idx => existingIndexNames.includes(idx))
    
    logSuccess(`Found ${indexes.length} total indexes`)
    logSuccess(`Found ${foundCritical.length}/${criticalIndexes.length} critical indexes`)
    
    return true
  } catch (error) {
    logWarning(`Index validation failed: ${error}`)
    return false
  }
}

async function validateData() {
  log('Validating essential data...')
  
  try {
    // Check if admin user exists
    const adminCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE email = 'admin@example.com'
    `)
    const adminExists = (adminCheck[0] as any).count > 0
    
    // Check if roles exist
    const rolesCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM roles
    `)
    const rolesCount = (rolesCheck[0] as any).count
    
    // Check if permissions exist
    const permissionsCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM permissions
    `)
    const permissionsCount = (permissionsCheck[0] as any).count
    
    if (adminExists) {
      logSuccess('Admin user exists')
    } else {
      logWarning('Admin user not found')
    }
    
    if (rolesCount >= 4) {
      logSuccess(`Found ${rolesCount} roles`)
    } else {
      logWarning(`Only ${rolesCount} roles found, expected at least 4`)
    }
    
    if (permissionsCount >= 18) {
      logSuccess(`Found ${permissionsCount} permissions`)
    } else {
      logWarning(`Only ${permissionsCount} permissions found, expected at least 18`)
    }
    
    return adminExists && rolesCount >= 4 && permissionsCount >= 18
  } catch (error) {
    logError(`Data validation failed: ${error}`)
    return false
  }
}

async function generateReport() {
  log('Generating validation report...')
  
  const connectionValid = await validateDatabaseConnection()
  if (!connectionValid) {
    logError('Cannot proceed - database connection failed')
    process.exit(1)
  }
  
  const tablesValid = await validateTables()
  const columnsValid = await validateColumns()
  const indexesValid = await validateIndexes()
  const dataValid = await validateData()
  
  console.log('\n📊 VALIDATION REPORT')
  console.log('==================')
  console.log(`Database Connection: ${connectionValid ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Table Structure: ${tablesValid ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Column Validation: ${columnsValid ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Index Validation: ${indexesValid ? '✅ PASS' : '⚠️  WARN'}`)
  console.log(`Data Validation: ${dataValid ? '✅ PASS' : '⚠️  WARN'}`)
  
  const overallValid = connectionValid && tablesValid && columnsValid
  
  if (overallValid) {
    logSuccess('\n🎉 Database schema validation PASSED!')
    logSuccess('Your e-commerce database is ready for development')
  } else {
    logError('\n💥 Database schema validation FAILED!')
    logError('Please fix the issues above before proceeding')
    process.exit(1)
  }
  
  if (!indexesValid || !dataValid) {
    logWarning('\n⚠️  Some warnings were found')
    logWarning('Consider running: npm run db:seed to populate initial data')
  }
}

async function main() {
  try {
    log('Starting database schema validation...\n')
    await generateReport()
  } catch (error) {
    logError(`Validation failed: ${error}`)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

main()