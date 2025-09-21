import { db } from '@/db'
import { eq, ilike, sql, desc, asc, and, or } from 'drizzle-orm'
import {
  collections,
  productCollections,
  categories,
  productCategories,
} from '@/db/schema/collections'
import { products } from '@/db/schema/products'

export interface CollectionsFilter {
  search?: string
  status?: 'draft' | 'active'
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'position'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface CollectionsResponse {
  collections: any[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/**
 * Get collections with filters, search, and pagination
 */
export async function getCollections(
  filters: CollectionsFilter = {}
): Promise<CollectionsResponse> {
  const {
    search,
    status,
    sortBy = 'position',
    sortOrder = 'asc',
    page = 1,
    limit = 20,
  } = filters

  try {
    let query = db
      .select({
        id: collections.id,
        handle: collections.handle,
        title: collections.title,
        description: collections.description,
        image: collections.image,
        status: collections.status,
        position: collections.position,
        rulesType: collections.rulesType,
        publishedAt: collections.publishedAt,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
        // Count of products in collection
        productCount: sql<number>`(
        SELECT COUNT(*) 
        FROM product_collections pc 
        WHERE pc.collection_id = ${collections.id}
      )`,
      })
      .from(collections)

    // Apply filters
    const conditions = []

    if (search) {
      conditions.push(
        or(
          ilike(collections.title, `%${search}%`),
          ilike(collections.description, `%${search}%`)
        )
      )
    }

    if (status) {
      conditions.push(eq(collections.status, status))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Apply sorting
    let orderColumn
    switch (sortBy) {
      case 'title':
        orderColumn = collections.title
        break
      case 'createdAt':
        orderColumn = collections.createdAt
        break
      case 'updatedAt':
        orderColumn = collections.updatedAt
        break
      default:
        orderColumn = collections.position
    }

    query =
      sortOrder === 'desc'
        ? query.orderBy(desc(orderColumn))
        : query.orderBy(asc(orderColumn))

    // Get total count for pagination
    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(collections)
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions))
    }

    const [collectionsResult, totalResult] = await Promise.all([
      query.limit(limit).offset((page - 1) * limit),
      totalQuery,
    ])

    const total = totalResult[0]?.count || 0

    return {
      collections: collectionsResult,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('Error fetching collections:', error)
    return {
      collections: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
    }
  }
}

/**
 * Get single collection by ID with products
 */
export async function getCollectionById(id: string) {
  try {
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, id))
      .limit(1)

    if (!collection) return null

    // Get product collections separately
    const collectionProducts = await db
      .select({
        productId: productCollections.productId,
        collectionId: productCollections.collectionId,
        position: productCollections.position,
        createdAt: productCollections.createdAt,
        product: {
          id: products.id,
          title: products.title,
          handle: products.handle,
          status: products.status,
          price: products.price,
        },
      })
      .from(productCollections)
      .innerJoin(products, eq(productCollections.productId, products.id))
      .where(eq(productCollections.collectionId, id))
      .orderBy(productCollections.position)

    return {
      ...collection,
      productCollections: collectionProducts,
    }
  } catch (error) {
    console.error('Error fetching collection by ID:', error)
    return null
  }
}

/**
 * Get collection by handle
 */
export async function getCollectionByHandle(handle: string) {
  try {
    return await db.query.collections.findFirst({
      where: eq(collections.handle, handle),
      with: {
        productCollections: {
          with: {
            product: {
              with: {
                productVariants: true,
              },
            },
          },
          orderBy: (productCollections, { asc }) => [
            asc(productCollections.position),
          ],
        },
      },
    })
  } catch (error) {
    console.error('Error fetching collection by handle:', error)
    return null
  }
}

/**
 * Get categories with hierarchy
 */
export async function getCategories() {
  try {
    const allCategories = await db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        handle: categories.handle,
        name: categories.name,
        description: categories.description,
        image: categories.image,
        path: categories.path,
        level: categories.level,
        position: categories.position,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
        // Count of products in category
        productCount: sql<number>`(
        SELECT COUNT(*) 
        FROM product_categories pc 
        WHERE pc.category_id = ${categories.id}
      )`,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.level), asc(categories.position))

    return allCategories
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string) {
  try {
    return await db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: {
        productCategories: {
          with: {
            product: {
              with: {
                productVariants: true,
              },
            },
          },
        },
      },
    })
  } catch (error) {
    console.error('Error fetching category by ID:', error)
    return null
  }
}

/**
 * Get products not in collection
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
