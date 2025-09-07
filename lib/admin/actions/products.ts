'use server'

import { db } from '@/db'
import { eq, sql, inArray } from 'drizzle-orm'
import { products, productVariants, productOptions, optionValues } from '@/db/schema/products'
import { createId } from '@paralleldrive/cuid2'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { auditActions } from '@/lib/admin/audit'

// Validation schemas
const ProductSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  handle: z.string().min(1, 'Handle is required').max(255, 'Handle too long')
    .regex(/^[a-z0-9-]+$/, 'Handle must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  price: z.number().min(0, 'Price must be positive'),
  compareAtPrice: z.number().min(0, 'Compare price must be positive').optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()).default([]),
  trackInventory: z.boolean().default(true),
  allowBackorder: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
})

const VariantSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Variant title is required'),
  price: z.number().min(0, 'Price must be positive'),
  sku: z.string().optional(),
  inventoryQuantity: z.number().min(0, 'Inventory must be positive').default(0),
  option1: z.string().optional(),
  option2: z.string().optional(),
  option3: z.string().optional(),
})

const ProductFormSchema = ProductSchema.extend({
  variants: z.array(VariantSchema).default([]),
  collections: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([])
})

export type ProductFormData = z.infer<typeof ProductFormSchema>

/**
 * Create a new product
 */
export async function createProduct(data: ProductFormData) {
  try {
    // Verify admin access
    await requireAdmin()

    // Validate input
    const validatedData = ProductFormSchema.parse(data)

    // Check if handle is available
    const existingProduct = await db.select({ id: products.id })
      .from(products)
      .where(eq(products.handle, validatedData.handle))
      .limit(1)

    if (existingProduct.length > 0) {
      return { 
        success: false, 
        error: 'A product with this handle already exists' 
      }
    }

    // Create product
    const productId = createId()
    const newProduct = await db.insert(products).values({
      id: productId,
      title: validatedData.title,
      handle: validatedData.handle,
      description: validatedData.description,
      status: validatedData.status,
      price: Math.round(validatedData.price * 100), // Convert to minor units
      compareAtPrice: validatedData.compareAtPrice ? 
        Math.round(validatedData.compareAtPrice * 100) : null,
      vendor: validatedData.vendor,
      productType: validatedData.productType,
      tags: validatedData.tags,
      trackInventory: validatedData.trackInventory,
      seoTitle: validatedData.seoTitle,
      seoDescription: validatedData.seoDescription,
    }).returning()

    // Create default variant if no variants provided
    if (validatedData.variants.length === 0) {
      await db.insert(productVariants).values({
        id: createId(),
        productId,
        title: 'Default',
        price: Math.round(validatedData.price * 100),
        sku: validatedData.handle.toUpperCase(),
        inventoryQuantity: 0,
      })
    } else {
      // Create variants
      for (const variant of validatedData.variants) {
        await db.insert(productVariants).values({
          id: createId(),
          productId,
          title: variant.title,
          price: Math.round(variant.price * 100),
          sku: variant.sku,
          inventoryQuantity: variant.inventoryQuantity,
          option1: variant.option1,
          option2: variant.option2,
          option3: variant.option3,
        })
      }
    }

    // Revalidate and redirect
    revalidatePath('/admin/products')
    
    return { 
      success: true, 
      productId,
      message: 'Product created successfully' 
    }
  } catch (error) {
    console.error('Error creating product:', error)
    
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: 'Validation error',
        fieldErrors: error.flatten().fieldErrors
      }
    }
    
    return { 
      success: false, 
      error: 'Failed to create product' 
    }
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(id: string, data: ProductFormData) {
  try {
    // Verify admin access
    await requireAdmin()

    // Validate input
    const validatedData = ProductFormSchema.parse(data)

    // Check if handle is available (excluding current product)
    const existingProduct = await db.select({ id: products.id })
      .from(products)
      .where(eq(products.handle, validatedData.handle))
      .limit(1)

    if (existingProduct.length > 0 && existingProduct[0].id !== id) {
      return { 
        success: false, 
        error: 'A product with this handle already exists' 
      }
    }

    // Update product
    await db.update(products)
      .set({
        title: validatedData.title,
        handle: validatedData.handle,
        description: validatedData.description,
        status: validatedData.status,
        price: Math.round(validatedData.price * 100),
        compareAtPrice: validatedData.compareAtPrice ? 
          Math.round(validatedData.compareAtPrice * 100) : null,
        vendor: validatedData.vendor,
        productType: validatedData.productType,
        tags: validatedData.tags,
        trackInventory: validatedData.trackInventory,
        seoTitle: validatedData.seoTitle,
        seoDescription: validatedData.seoDescription,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))

    // TODO: Update variants (complex logic for add/update/delete variants)
    // For now, we'll handle this in a separate action

    // Revalidate
    revalidatePath('/admin/products')
    revalidatePath(`/admin/products/${id}`)
    
    return { 
      success: true, 
      message: 'Product updated successfully' 
    }
  } catch (error) {
    console.error('Error updating product:', error)
    
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: 'Validation error',
        fieldErrors: error.flatten().fieldErrors
      }
    }
    
    return { 
      success: false, 
      error: 'Failed to update product' 
    }
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string) {
  try {
    // Verify admin access
    await requireAdmin()

    // Delete variants first (foreign key constraint)
    await db.delete(productVariants).where(eq(productVariants.productId, id))
    
    // Delete product options and values
    const productOptionsList = await db.select({ id: productOptions.id })
      .from(productOptions)
      .where(eq(productOptions.productId, id))

    for (const option of productOptionsList) {
      await db.delete(optionValues).where(eq(optionValues.optionId, option.id))
    }
    
    await db.delete(productOptions).where(eq(productOptions.productId, id))

    // Delete product
    await db.delete(products).where(eq(products.id, id))

    // Revalidate
    revalidatePath('/admin/products')
    
    return { 
      success: true, 
      message: 'Product deleted successfully' 
    }
  } catch (error) {
    console.error('Error deleting product:', error)
    return { 
      success: false, 
      error: 'Failed to delete product' 
    }
  }
}

/**
 * Update product status (publish/unpublish)
 */
export async function updateProductStatus(id: string, status: 'draft' | 'active' | 'archived') {
  try {
    // Verify admin access
    await requireAdmin()

    await db.update(products)
      .set({ 
        status, 
        updatedAt: new Date(),
        publishedAt: status === 'active' ? new Date() : null
      })
      .where(eq(products.id, id))

    // Revalidate
    revalidatePath('/admin/products')
    
    return { 
      success: true, 
      message: `Product ${status === 'active' ? 'published' : status === 'draft' ? 'unpublished' : 'archived'} successfully` 
    }
  } catch (error) {
    console.error('Error updating product status:', error)
    return { 
      success: false, 
      error: 'Failed to update product status' 
    }
  }
}

/**
 * Bulk update product status
 */
export async function bulkUpdateProductStatus(ids: string[], status: 'draft' | 'active' | 'archived') {
  if (ids.length === 0) {
    return { success: false, error: 'No products selected' }
  }

  try {
    // Verify admin access
    await requireAdmin()

    // Get current products for audit
    const currentProducts = await db.select()
      .from(products)
      .where(inArray(products.id, ids))

    // Update all products
    const updatedProducts = await db.update(products)
      .set({ 
        status, 
        updatedAt: new Date(),
        publishedAt: status === 'active' ? new Date() : null
      })
      .where(inArray(products.id, ids))
      .returning()

    // Log bulk audit action
    const auditItems = updatedProducts.map((product, index) => {
      const before = currentProducts.find(p => p.id === product.id)
      return {
        resourceId: product.id,
        resourceTitle: product.title,
        status: 'success' as const,
        changes: {
          before: { status: before?.status },
          after: { status: product.status }
        }
      }
    })

    await auditActions.productsBulkUpdated(auditItems, {
      operation: 'status_update',
      newStatus: status
    })

    // Revalidate
    revalidatePath('/admin/products')
    
    return { 
      success: true, 
      updatedCount: updatedProducts.length,
      message: `${updatedProducts.length} products updated successfully` 
    }
  } catch (error) {
    console.error('Error bulk updating products:', error)
    return { 
      success: false, 
      error: 'Failed to update products' 
    }
  }
}

/**
 * Bulk delete products
 */
export async function bulkDeleteProducts(ids: string[]) {
  if (ids.length === 0) {
    return { success: false, error: 'No products selected' }
  }

  try {
    // Verify admin access
    await requireAdmin()

    // Get current products for audit
    const currentProducts = await db.select()
      .from(products)
      .where(inArray(products.id, ids))

    const auditItems = []

    // Delete each product (with proper cleanup)
    for (const id of ids) {
      const product = currentProducts.find(p => p.id === id)
      
      try {
        // Delete variants first (foreign key constraint)
        await db.delete(productVariants).where(eq(productVariants.productId, id))
        
        // Delete product options and values
        const productOptionsList = await db.select({ id: productOptions.id })
          .from(productOptions)
          .where(eq(productOptions.productId, id))

        for (const option of productOptionsList) {
          await db.delete(optionValues).where(eq(optionValues.optionId, option.id))
        }
        
        await db.delete(productOptions).where(eq(productOptions.productId, id))

        // Delete product
        await db.delete(products).where(eq(products.id, id))

        auditItems.push({
          resourceId: id,
          resourceTitle: product?.title || 'Unknown Product',
          status: 'success' as const,
          changes: {
            before: product
          }
        })
      } catch (error) {
        console.error(`Error deleting product ${id}:`, error)
        auditItems.push({
          resourceId: id,
          resourceTitle: product?.title || 'Unknown Product',
          status: 'error' as const,
          errorMessage: 'Failed to delete product'
        })
      }
    }

    // Log bulk audit action
    await auditActions.productsBulkDeleted(auditItems, {
      operation: 'bulk_delete',
      totalSelected: ids.length
    })

    // Revalidate
    revalidatePath('/admin/products')
    
    const successCount = auditItems.filter(item => item.status === 'success').length
    const errorCount = auditItems.filter(item => item.status === 'error').length
    
    return { 
      success: errorCount === 0, 
      deletedCount: successCount,
      errorCount,
      message: errorCount === 0 
        ? `${successCount} products deleted successfully`
        : `${successCount} products deleted, ${errorCount} failed`
    }
  } catch (error) {
    console.error('Error bulk deleting products:', error)
    return { 
      success: false, 
      error: 'Failed to delete products' 
    }
  }
}

/**
 * Bulk update product vendor
 */
export async function bulkUpdateProductVendor(ids: string[], vendor: string) {
  if (ids.length === 0) {
    return { success: false, error: 'No products selected' }
  }

  try {
    // Verify admin access
    await requireAdmin()

    // Get current products for audit
    const currentProducts = await db.select()
      .from(products)
      .where(inArray(products.id, ids))

    // Update all products
    const updatedProducts = await db.update(products)
      .set({ 
        vendor: vendor || null,
        updatedAt: new Date()
      })
      .where(inArray(products.id, ids))
      .returning()

    // Log bulk audit action
    const auditItems = updatedProducts.map((product, index) => {
      const before = currentProducts.find(p => p.id === product.id)
      return {
        resourceId: product.id,
        resourceTitle: product.title,
        status: 'success' as const,
        changes: {
          before: { vendor: before?.vendor },
          after: { vendor: product.vendor }
        }
      }
    })

    await auditActions.productsBulkUpdated(auditItems, {
      operation: 'vendor_update',
      newVendor: vendor
    })

    // Revalidate
    revalidatePath('/admin/products')
    
    return { 
      success: true, 
      updatedCount: updatedProducts.length,
      message: `${updatedProducts.length} products updated successfully` 
    }
  } catch (error) {
    console.error('Error bulk updating product vendor:', error)
    return { 
      success: false, 
      error: 'Failed to update product vendor' 
    }
  }
}

/**
 * Bulk update product type
 */
export async function bulkUpdateProductType(ids: string[], productType: string) {
  if (ids.length === 0) {
    return { success: false, error: 'No products selected' }
  }

  try {
    // Verify admin access
    await requireAdmin()

    // Get current products for audit
    const currentProducts = await db.select()
      .from(products)
      .where(inArray(products.id, ids))

    // Update all products
    const updatedProducts = await db.update(products)
      .set({ 
        productType: productType || null,
        updatedAt: new Date()
      })
      .where(inArray(products.id, ids))
      .returning()

    // Log bulk audit action
    const auditItems = updatedProducts.map((product, index) => {
      const before = currentProducts.find(p => p.id === product.id)
      return {
        resourceId: product.id,
        resourceTitle: product.title,
        status: 'success' as const,
        changes: {
          before: { productType: before?.productType },
          after: { productType: product.productType }
        }
      }
    })

    await auditActions.productsBulkUpdated(auditItems, {
      operation: 'type_update',
      newProductType: productType
    })

    // Revalidate
    revalidatePath('/admin/products')
    
    return { 
      success: true, 
      updatedCount: updatedProducts.length,
      message: `${updatedProducts.length} products updated successfully` 
    }
  } catch (error) {
    console.error('Error bulk updating product type:', error)
    return { 
      success: false, 
      error: 'Failed to update product type' 
    }
  }
}

