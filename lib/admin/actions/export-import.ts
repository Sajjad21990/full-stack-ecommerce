'use server'

import { db } from '@/db'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { products, productVariants } from '@/db/schema/products'
import { collections, categories } from '@/db/schema/collections'
import { users } from '@/db/schema/auth'
import { auditActions } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/auth'
import { createId } from '@paralleldrive/cuid2'
import { hash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'

export interface ExportOptions {
  format: 'csv' | 'json'
  includeVariants?: boolean
  includeCollections?: boolean
  includeCategories?: boolean
  filters?: {
    status?: string[]
    vendor?: string[]
    productType?: string[]
    collectionIds?: string[]
    categoryIds?: string[]
  }
}

export interface ImportOptions {
  format: 'csv' | 'json'
  updateExisting?: boolean
  createCollections?: boolean
  createCategories?: boolean
}

/**
 * Export products data
 */
export async function exportProducts(options: ExportOptions) {
  try {
    await requireAdmin()

    // Build query based on filters
    let query = db.select({
      id: products.id,
      title: products.title,
      handle: products.handle,
      description: products.description,
      status: products.status,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      vendor: products.vendor,
      productType: products.productType,
      tags: products.tags,
      trackInventory: products.trackInventory,
      allowBackorder: products.allowBackorder,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      publishedAt: products.publishedAt
    }).from(products)

    // Apply filters
    if (options.filters) {
      const conditions = []
      
      if (options.filters.status?.length) {
        conditions.push(inArray(products.status, options.filters.status as any))
      }
      
      if (options.filters.vendor?.length) {
        conditions.push(inArray(products.vendor, options.filters.vendor))
      }
      
      if (options.filters.productType?.length) {
        conditions.push(inArray(products.productType, options.filters.productType))
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions))
      }
    }

    const productsData = await query

    // Get variants if requested
    let variantsData = []
    if (options.includeVariants) {
      variantsData = await db.select().from(productVariants)
        .where(inArray(productVariants.productId, productsData.map(p => p.id)))
    }

    // Get collections if requested
    let collectionsData = []
    if (options.includeCollections) {
      collectionsData = await db.select().from(collections)
    }

    // Get categories if requested
    let categoriesData = []
    if (options.includeCategories) {
      categoriesData = await db.select().from(categories)
    }

    const exportData = {
      products: productsData,
      variants: variantsData,
      collections: collectionsData,
      categories: categoriesData,
      exportedAt: new Date().toISOString(),
      totalRecords: productsData.length
    }

    // Log export action
    await auditActions.dataExported('products', productsData.length, options.filters)

    if (options.format === 'csv') {
      return {
        success: true,
        data: convertToCSV(productsData),
        filename: `products-export-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv'
      }
    } else {
      return {
        success: true,
        data: JSON.stringify(exportData, null, 2),
        filename: `products-export-${new Date().toISOString().split('T')[0]}.json`,
        contentType: 'application/json'
      }
    }
  } catch (error) {
    console.error('Error exporting products:', error)
    return {
      success: false,
      error: 'Failed to export products'
    }
  }
}

/**
 * Export users data
 */
export async function exportUsers() {
  try {
    await requireAdmin()

    const usersData = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      emailVerified: users.emailVerified,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users)

    // Log export action
    await auditActions.dataExported('users', usersData.length)

    return {
      success: true,
      data: JSON.stringify(usersData, null, 2),
      filename: `users-export-${new Date().toISOString().split('T')[0]}.json`,
      contentType: 'application/json'
    }
  } catch (error) {
    console.error('Error exporting users:', error)
    return {
      success: false,
      error: 'Failed to export users'
    }
  }
}

/**
 * Import products data
 */
export async function importProducts(data: string, options: ImportOptions) {
  try {
    await requireAdmin()

    let importData
    if (options.format === 'json') {
      importData = JSON.parse(data)
    } else {
      importData = parseCSV(data)
    }

    const results = {
      created: 0,
      updated: 0,
      errors: 0,
      errorMessages: [] as string[]
    }

    // Process each product
    for (const productData of importData.products || importData) {
      try {
        // Check if product exists
        const existing = await db.select({ id: products.id })
          .from(products)
          .where(eq(products.handle, productData.handle))
          .limit(1)

        if (existing.length > 0 && !options.updateExisting) {
          results.errors++
          results.errorMessages.push(`Product ${productData.handle} already exists`)
          continue
        }

        const productId = existing.length > 0 ? existing[0].id : createId()

        const productValues = {
          id: productId,
          title: productData.title,
          handle: productData.handle,
          description: productData.description || null,
          status: productData.status || 'draft',
          price: parseFloat(productData.price) || 0,
          compareAtPrice: productData.compareAtPrice ? parseFloat(productData.compareAtPrice) : null,
          vendor: productData.vendor || null,
          productType: productData.productType || null,
          tags: Array.isArray(productData.tags) ? productData.tags : [],
          trackInventory: productData.trackInventory !== false,
          allowBackorder: productData.allowBackorder === true,
          seoTitle: productData.seoTitle || null,
          seoDescription: productData.seoDescription || null,
          updatedAt: new Date()
        }

        if (existing.length > 0) {
          // Update existing product
          await db.update(products)
            .set(productValues)
            .where(eq(products.id, productId))
          results.updated++
        } else {
          // Create new product
          await db.insert(products).values({
            ...productValues,
            createdAt: new Date()
          })
          results.created++
        }

        // Handle variants if provided
        if (productData.variants && Array.isArray(productData.variants)) {
          // Remove existing variants if updating
          if (existing.length > 0) {
            await db.delete(productVariants)
              .where(eq(productVariants.productId, productId))
          }

          // Insert new variants
          for (const variant of productData.variants) {
            await db.insert(productVariants).values({
              id: createId(),
              productId,
              title: variant.title || 'Default Title',
              price: parseFloat(variant.price) || parseFloat(productData.price) || 0,
              sku: variant.sku || null,
              inventoryQuantity: parseInt(variant.inventoryQuantity) || 0,
              option1: variant.option1 || null,
              option2: variant.option2 || null,
              option3: variant.option3 || null,
              createdAt: new Date(),
              updatedAt: new Date()
            })
          }
        }
      } catch (error) {
        console.error(`Error processing product ${productData.handle}:`, error)
        results.errors++
        results.errorMessages.push(`Failed to import ${productData.handle}: ${error}`)
      }
    }

    // Log import action
    await auditActions.dataImported('products', results.created + results.updated, {
      created: results.created,
      updated: results.updated,
      errors: results.errors
    })

    revalidatePath('/admin/products')

    return {
      success: true,
      results,
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.errors} errors`
    }
  } catch (error) {
    console.error('Error importing products:', error)
    return {
      success: false,
      error: 'Failed to import products: ' + (error as Error).message
    }
  }
}

/**
 * Import users data
 */
export async function importUsers(data: string) {
  try {
    await requireAdmin()

    const importData = JSON.parse(data)
    const results = {
      created: 0,
      updated: 0,
      errors: 0,
      errorMessages: [] as string[]
    }

    // Process each user
    for (const userData of importData) {
      try {
        // Check if user exists
        const existing = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.email, userData.email))
          .limit(1)

        if (existing.length > 0) {
          results.errors++
          results.errorMessages.push(`User ${userData.email} already exists`)
          continue
        }

        // Create new user
        const hashedPassword = userData.password 
          ? await hash(userData.password, 12) 
          : null

        await db.insert(users).values({
          id: createId(),
          email: userData.email,
          name: userData.name,
          role: userData.role || 'customer',
          status: userData.status || 'active',
          password: hashedPassword,
          emailVerified: userData.emailVerified ? new Date(userData.emailVerified) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        })

        results.created++
      } catch (error) {
        console.error(`Error processing user ${userData.email}:`, error)
        results.errors++
        results.errorMessages.push(`Failed to import ${userData.email}: ${error}`)
      }
    }

    // Log import action
    await auditActions.dataImported('users', results.created, {
      created: results.created,
      errors: results.errors
    })

    revalidatePath('/admin/users')

    return {
      success: true,
      results,
      message: `Import completed: ${results.created} created, ${results.errors} errors`
    }
  } catch (error) {
    console.error('Error importing users:', error)
    return {
      success: false,
      error: 'Failed to import users: ' + (error as Error).message
    }
  }
}

// Helper functions

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""')
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    )
  ].join('\n')
  
  return csvContent
}

function parseCSV(csvData: string): any[] {
  const lines = csvData.split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const obj: any = {}
    
    headers.forEach((header, index) => {
      let value: any = values[index] || ''
      
      // Try to parse as JSON for complex fields
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          value = JSON.parse(value)
        } catch {}
      }
      
      // Convert numeric fields
      if (!isNaN(Number(value)) && value !== '') {
        value = Number(value)
      }
      
      // Convert boolean fields
      if (value === 'true') value = true
      if (value === 'false') value = false
      
      obj[header] = value
    })
    
    return obj
  }).filter(obj => Object.values(obj).some(v => v !== ''))
}