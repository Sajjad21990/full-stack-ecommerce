'use server'

import { db } from '@/db'
import { eq, and, sql, inArray, ilike } from 'drizzle-orm'
import {
  collections,
  categories,
  productCollections,
  productCategories,
} from '@/db/schema/collections'
import { products } from '@/db/schema/products'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auditActions } from '@/lib/admin/audit'

export interface CreateCollectionData {
  title: string
  handle: string
  description?: string
  image?: string
  status: 'draft' | 'active'
  rulesType: 'manual' | 'automated'
  position?: number
}

export interface UpdateCollectionData extends CreateCollectionData {
  id: string
}

export interface CreateCategoryData {
  name: string
  handle: string
  description?: string
  image?: string
  parentId?: string
  position?: number
}

export interface UpdateCategoryData extends CreateCategoryData {
  id: string
}

/**
 * Create a new collection
 */
export async function createCollection(data: CreateCollectionData) {
  try {
    const [result] = await db
      .insert(collections)
      .values({
        title: data.title,
        handle: data.handle,
        description: data.description,
        image: data.image,
        status: data.status,
        rulesType: data.rulesType,
        position: data.position || 0,
        publishedAt: data.status === 'active' ? new Date() : null,
      })
      .returning()

    revalidatePath('/admin/collections')
    return { success: true, collection: result }
  } catch (error) {
    console.error('Error creating collection:', error)
    return { success: false, error: 'Failed to create collection' }
  }
}

/**
 * Update an existing collection
 */
export async function updateCollection(data: UpdateCollectionData) {
  try {
    const [result] = await db
      .update(collections)
      .set({
        title: data.title,
        handle: data.handle,
        description: data.description,
        image: data.image,
        status: data.status,
        rulesType: data.rulesType,
        position: data.position,
        publishedAt: data.status === 'active' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, data.id))
      .returning()

    revalidatePath('/admin/collections')
    return { success: true, collection: result }
  } catch (error) {
    console.error('Error updating collection:', error)
    return { success: false, error: 'Failed to update collection' }
  }
}

/**
 * Delete a collection
 */
export async function deleteCollection(id: string) {
  try {
    // First remove all product associations
    await db
      .delete(productCollections)
      .where(eq(productCollections.collectionId, id))

    // Then delete the collection
    await db.delete(collections).where(eq(collections.id, id))

    revalidatePath('/admin/collections')
    return { success: true }
  } catch (error) {
    console.error('Error deleting collection:', error)
    return { success: false, error: 'Failed to delete collection' }
  }
}

/**
 * Add products to collection
 */
export async function addProductsToCollection(
  collectionId: string,
  productIds: string[]
) {
  try {
    // Get current max position
    const maxPositionResult = await db
      .select({ position: productCollections.position })
      .from(productCollections)
      .where(eq(productCollections.collectionId, collectionId))
      .orderBy(productCollections.position)
      .limit(1)

    let nextPosition = (maxPositionResult[0]?.position || 0) + 1

    // Insert product associations
    const insertData = productIds.map((productId) => ({
      collectionId,
      productId,
      position: nextPosition++,
    }))

    await db.insert(productCollections).values(insertData)

    revalidatePath('/admin/collections')
    return { success: true }
  } catch (error) {
    console.error('Error adding products to collection:', error)
    return { success: false, error: 'Failed to add products to collection' }
  }
}

/**
 * Remove product from collection
 */
export async function removeProductFromCollection(
  collectionId: string,
  productId: string
) {
  try {
    await db
      .delete(productCollections)
      .where(
        and(
          eq(productCollections.collectionId, collectionId),
          eq(productCollections.productId, productId)
        )
      )

    revalidatePath('/admin/collections')
    return { success: true }
  } catch (error) {
    console.error('Error removing product from collection:', error)
    return { success: false, error: 'Failed to remove product from collection' }
  }
}

/**
 * Update product positions in collection
 */
export async function updateProductPositions(
  collectionId: string,
  updates: { productId: string; position: number }[]
) {
  try {
    for (const update of updates) {
      await db
        .update(productCollections)
        .set({ position: update.position })
        .where(
          and(
            eq(productCollections.collectionId, collectionId),
            eq(productCollections.productId, update.productId)
          )
        )
    }

    revalidatePath('/admin/collections')
    return { success: true }
  } catch (error) {
    console.error('Error updating product positions:', error)
    return { success: false, error: 'Failed to update product positions' }
  }
}

/**
 * Create a new category
 */
export async function createCategory(data: CreateCategoryData) {
  try {
    console.log('CreateCategory received data:', data)

    // Calculate path and level based on parent
    let path = data.handle
    let level = 0

    // Handle empty string or 'none' as null for parentId
    const parentId =
      data.parentId && data.parentId !== '' && data.parentId !== 'none'
        ? data.parentId
        : null

    console.log('Processed parentId:', parentId)

    if (parentId) {
      const parent = await db.query.categories.findFirst({
        where: eq(categories.id, parentId),
        columns: { path: true, level: true },
      })

      if (parent) {
        path = `${parent.path}/${data.handle}`
        level = parent.level + 1
      }
    }

    const [result] = await db
      .insert(categories)
      .values({
        name: data.name,
        handle: data.handle,
        description: data.description,
        image: data.image,
        parentId,
        path,
        level,
        position: data.position || 0,
      })
      .returning()

    revalidatePath('/admin/collections')
    return { success: true, category: result }
  } catch (error) {
    console.error('Error creating category:', error)
    return { success: false, error: 'Failed to create category' }
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(data: UpdateCategoryData) {
  try {
    // Recalculate path and level if parent changed
    let path = data.handle
    let level = 0

    // Handle empty string or 'none' as null for parentId
    const parentId =
      data.parentId && data.parentId !== '' && data.parentId !== 'none'
        ? data.parentId
        : null

    if (parentId) {
      const parent = await db.query.categories.findFirst({
        where: eq(categories.id, parentId),
        columns: { path: true, level: true },
      })

      if (parent) {
        path = `${parent.path}/${data.handle}`
        level = parent.level + 1
      }
    }

    const [result] = await db
      .update(categories)
      .set({
        name: data.name,
        handle: data.handle,
        description: data.description,
        image: data.image,
        parentId,
        path,
        level,
        position: data.position,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, data.id))
      .returning()

    revalidatePath('/admin/collections')
    return { success: true, category: result }
  } catch (error) {
    console.error('Error updating category:', error)
    return { success: false, error: 'Failed to update category' }
  }
}

/**
 * Get products not in collection (server action for client components)
 */
export async function getProductsNotInCollection(
  collectionId: string,
  search?: string
) {
  try {
    let query = db
      .select({
        id: products.id,
        title: products.title,
        handle: products.handle,
        status: products.status,
        price: products.price,
      })
      .from(products)
      .where(
        and(
          sql`${products.id} NOT IN (
            SELECT product_id 
            FROM product_collections 
            WHERE collection_id = ${collectionId}
          )`,
          eq(products.status, 'active')
        )
      )

    if (search) {
      query = query.where(ilike(products.title, `%${search}%`))
    }

    return await query.limit(20)
  } catch (error) {
    console.error('Error fetching products not in collection:', error)
    return []
  }
}

/**
 * Check if collection handle is available
 */
export async function isCollectionHandleAvailable(
  handle: string,
  excludeId?: string
) {
  try {
    const existing = await db
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.handle, handle))
      .limit(1)

    if (excludeId && existing.length > 0) {
      return existing[0].id === excludeId
    }

    return existing.length === 0
  } catch (error) {
    console.error('Error checking collection handle availability:', error)
    return false
  }
}

/**
 * Check if category handle is available
 */
export async function isCategoryHandleAvailable(
  handle: string,
  excludeId?: string
) {
  try {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.handle, handle))
      .limit(1)

    if (excludeId && existing.length > 0) {
      return existing[0].id === excludeId
    }

    return existing.length === 0
  } catch (error) {
    console.error('Error checking category handle availability:', error)
    return false
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string) {
  try {
    // First remove all product associations
    await db
      .delete(productCategories)
      .where(eq(productCategories.categoryId, id))

    // Then delete the category
    await db.delete(categories).where(eq(categories.id, id))

    revalidatePath('/admin/collections')
    return { success: true }
  } catch (error) {
    console.error('Error deleting category:', error)
    return { success: false, error: 'Failed to delete category' }
  }
}

/**
 * Add products to category
 */
export async function addProductsToCategory(
  categoryId: string,
  productIds: string[]
) {
  try {
    const insertData = productIds.map((productId) => ({
      categoryId,
      productId,
    }))

    await db.insert(productCategories).values(insertData)

    revalidatePath('/admin/collections')
    return { success: true }
  } catch (error) {
    console.error('Error adding products to category:', error)
    return { success: false, error: 'Failed to add products to category' }
  }
}

/**
 * Remove product from category
 */
export async function removeProductFromCategory(
  categoryId: string,
  productId: string
) {
  try {
    await db
      .delete(productCategories)
      .where(
        and(
          eq(productCategories.categoryId, categoryId),
          eq(productCategories.productId, productId)
        )
      )

    revalidatePath('/admin/collections')
    return { success: true }
  } catch (error) {
    console.error('Error removing product from category:', error)
    return { success: false, error: 'Failed to remove product from category' }
  }
}

// Bulk Operations

/**
 * Bulk update collection status
 */
export async function bulkUpdateCollectionStatus(
  ids: string[],
  status: 'draft' | 'active'
) {
  if (ids.length === 0) {
    return { success: false, error: 'No collections selected' }
  }

  try {
    // Get current collections for audit
    const currentCollections = await db
      .select()
      .from(collections)
      .where(inArray(collections.id, ids))

    // Update all collections
    const updatedCollections = await db
      .update(collections)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(inArray(collections.id, ids))
      .returning()

    // Log bulk audit action
    const auditItems = updatedCollections.map((collection, index) => {
      const before = currentCollections.find((c) => c.id === collection.id)
      return {
        resourceId: collection.id,
        resourceTitle: collection.title,
        status: 'success' as const,
        changes: {
          before: { status: before?.status },
          after: { status: collection.status },
        },
      }
    })

    await auditActions.collectionsBulkUpdated(auditItems, {
      operation: 'status_update',
      newStatus: status,
    })

    revalidatePath('/admin/collections')

    return {
      success: true,
      updatedCount: updatedCollections.length,
      message: `${updatedCollections.length} collections updated successfully`,
    }
  } catch (error) {
    console.error('Error bulk updating collections:', error)
    return {
      success: false,
      error: 'Failed to update collections',
    }
  }
}

/**
 * Bulk delete collections
 */
export async function bulkDeleteCollections(ids: string[]) {
  if (ids.length === 0) {
    return { success: false, error: 'No collections selected' }
  }

  try {
    // Get current collections for audit
    const currentCollections = await db
      .select()
      .from(collections)
      .where(inArray(collections.id, ids))

    const auditItems = []

    // Delete each collection (with proper cleanup)
    for (const id of ids) {
      const collection = currentCollections.find((c) => c.id === id)

      try {
        // Remove all product associations first
        await db
          .delete(productCollections)
          .where(eq(productCollections.collectionId, id))

        // Delete collection
        await db.delete(collections).where(eq(collections.id, id))

        auditItems.push({
          resourceId: id,
          resourceTitle: collection?.title || 'Unknown Collection',
          status: 'success' as const,
          changes: {
            before: collection,
          },
        })
      } catch (error) {
        console.error(`Error deleting collection ${id}:`, error)
        auditItems.push({
          resourceId: id,
          resourceTitle: collection?.title || 'Unknown Collection',
          status: 'error' as const,
          errorMessage: 'Failed to delete collection',
        })
      }
    }

    // Log bulk audit action
    await auditActions.collectionsBulkDeleted(auditItems, {
      operation: 'bulk_delete',
      totalSelected: ids.length,
    })

    revalidatePath('/admin/collections')

    const successCount = auditItems.filter(
      (item) => item.status === 'success'
    ).length
    const errorCount = auditItems.filter(
      (item) => item.status === 'error'
    ).length

    return {
      success: errorCount === 0,
      deletedCount: successCount,
      errorCount,
      message:
        errorCount === 0
          ? `${successCount} collections deleted successfully`
          : `${successCount} collections deleted, ${errorCount} failed`,
    }
  } catch (error) {
    console.error('Error bulk deleting collections:', error)
    return {
      success: false,
      error: 'Failed to delete collections',
    }
  }
}

/**
 * Bulk update category status
 */
export async function bulkUpdateCategoryStatus(
  ids: string[],
  status: 'active' | 'inactive'
) {
  if (ids.length === 0) {
    return { success: false, error: 'No categories selected' }
  }

  try {
    // Get current categories for audit
    const currentCategories = await db
      .select()
      .from(categories)
      .where(inArray(categories.id, ids))

    // Update all categories
    const updatedCategories = await db
      .update(categories)
      .set({
        status: status as any,
        updatedAt: new Date(),
      })
      .where(inArray(categories.id, ids))
      .returning()

    // Log bulk audit action
    const auditItems = updatedCategories.map((category, index) => {
      const before = currentCategories.find((c) => c.id === category.id)
      return {
        resourceId: category.id,
        resourceTitle: category.name,
        status: 'success' as const,
        changes: {
          before: { status: before?.status },
          after: { status: category.status },
        },
      }
    })

    await auditActions.categoriesBulkUpdated(auditItems, {
      operation: 'status_update',
      newStatus: status,
    })

    revalidatePath('/admin/collections')

    return {
      success: true,
      updatedCount: updatedCategories.length,
      message: `${updatedCategories.length} categories updated successfully`,
    }
  } catch (error) {
    console.error('Error bulk updating categories:', error)
    return {
      success: false,
      error: 'Failed to update categories',
    }
  }
}

/**
 * Bulk delete categories
 */
export async function bulkDeleteCategories(ids: string[]) {
  if (ids.length === 0) {
    return { success: false, error: 'No categories selected' }
  }

  try {
    // Get current categories for audit
    const currentCategories = await db
      .select()
      .from(categories)
      .where(inArray(categories.id, ids))

    const auditItems = []

    // Delete each category (with proper cleanup)
    for (const id of ids) {
      const category = currentCategories.find((c) => c.id === id)

      try {
        // Remove all product associations first
        await db
          .delete(productCategories)
          .where(eq(productCategories.categoryId, id))

        // Delete category
        await db.delete(categories).where(eq(categories.id, id))

        auditItems.push({
          resourceId: id,
          resourceTitle: category?.name || 'Unknown Category',
          status: 'success' as const,
          changes: {
            before: category,
          },
        })
      } catch (error) {
        console.error(`Error deleting category ${id}:`, error)
        auditItems.push({
          resourceId: id,
          resourceTitle: category?.name || 'Unknown Category',
          status: 'error' as const,
          errorMessage: 'Failed to delete category',
        })
      }
    }

    // Log bulk audit action
    await auditActions.categoriesBulkDeleted(auditItems, {
      operation: 'bulk_delete',
      totalSelected: ids.length,
    })

    revalidatePath('/admin/collections')

    const successCount = auditItems.filter(
      (item) => item.status === 'success'
    ).length
    const errorCount = auditItems.filter(
      (item) => item.status === 'error'
    ).length

    return {
      success: errorCount === 0,
      deletedCount: successCount,
      errorCount,
      message:
        errorCount === 0
          ? `${successCount} categories deleted successfully`
          : `${successCount} categories deleted, ${errorCount} failed`,
    }
  } catch (error) {
    console.error('Error bulk deleting categories:', error)
    return {
      success: false,
      error: 'Failed to delete categories',
    }
  }
}
