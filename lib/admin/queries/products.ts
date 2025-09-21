import { db } from '@/db'
import { eq, and, or, ilike, desc, asc, count, sql } from 'drizzle-orm'
import {
  products,
  productVariants,
  productOptions,
  optionValues,
  productImages,
} from '@/db/schema/products'
import { collections, categories } from '@/db/schema/collections'

export interface ProductsFilter {
  search?: string
  status?: 'draft' | 'active' | 'archived'
  category?: string
  collection?: string
  sortBy?: 'title' | 'price' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface ProductsResponse {
  products: any[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/**
 * Get products with filters, search, and pagination
 */
export async function getProducts(
  filters: ProductsFilter = {}
): Promise<ProductsResponse> {
  const {
    search,
    status,
    category,
    collection,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = filters

  try {
    let query = db
      .select({
        id: products.id,
        title: products.title,
        handle: products.handle,
        status: products.status,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        trackInventory: products.trackInventory,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        vendor: products.vendor,
        productType: products.productType,
        tags: products.tags,
        description: products.description,
        publishedAt: products.publishedAt,
      })
      .from(products)

    // Apply filters - search across multiple fields
    if (search) {
      query = query.where(
        or(
          ilike(products.title, `%${search}%`),
          ilike(products.vendor, `%${search}%`),
          ilike(products.productType, `%${search}%`),
          ilike(products.handle, `%${search}%`),
          ilike(products.description, `%${search}%`)
        )
      )
    }

    if (status) {
      query = query.where(eq(products.status, status))
    }

    // Apply sorting
    let orderColumn
    switch (sortBy) {
      case 'title':
        orderColumn = products.title
        break
      case 'price':
        orderColumn = products.price
        break
      case 'updatedAt':
        orderColumn = products.updatedAt
        break
      case 'createdAt':
      default:
        orderColumn = products.createdAt
        break
    }

    query =
      sortOrder === 'desc'
        ? query.orderBy(desc(orderColumn))
        : query.orderBy(asc(orderColumn))

    // Get total count for pagination
    let totalQuery = db.select({ count: sql<number>`count(*)` }).from(products)

    // Apply the same filters to count query
    if (search) {
      totalQuery = totalQuery.where(
        or(
          ilike(products.title, `%${search}%`),
          ilike(products.vendor, `%${search}%`),
          ilike(products.productType, `%${search}%`),
          ilike(products.handle, `%${search}%`),
          ilike(products.description, `%${search}%`)
        )
      )
    }
    if (status) {
      totalQuery = totalQuery.where(eq(products.status, status))
    }

    const [productsResult, totalResult] = await Promise.all([
      query.limit(limit).offset((page - 1) * limit),
      totalQuery,
    ])

    const total = totalResult[0]?.count || 0

    return {
      products: productsResult,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return {
      products: [],
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
 * Get single product by ID with full details
 */
export async function getProductById(id: string) {
  try {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1)

    if (!product || product.length === 0) {
      return null
    }

    // Get variants
    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))

    // Get options
    const options = await db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, id))

    // Get option values for each option
    const optionsWithValues = await Promise.all(
      options.map(async (option) => {
        const values = await db
          .select()
          .from(optionValues)
          .where(eq(optionValues.optionId, option.id))
        return { ...option, optionValues: values }
      })
    )

    // Get product images
    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position))

    return {
      ...product[0],
      productOptions: optionsWithValues,
      productVariants: variants,
      images: images.map((img) => img.url),
      productCollections: [],
      productCategories: [],
    }
  } catch (error) {
    console.error('Error fetching product by ID:', error)
    return null
  }
}

/**
 * Get product by handle
 */
export async function getProductByHandle(handle: string) {
  try {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.handle, handle))
      .limit(1)

    if (!product || product.length === 0) {
      return null
    }

    const id = product[0].id

    // Get variants
    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))

    // Get options
    const options = await db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, id))

    // Get option values for each option
    const optionsWithValues = await Promise.all(
      options.map(async (option) => {
        const values = await db
          .select()
          .from(optionValues)
          .where(eq(optionValues.optionId, option.id))
        return { ...option, optionValues: values }
      })
    )

    // Get product images
    const images = await db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position))

    return {
      ...product[0],
      productOptions: optionsWithValues,
      productVariants: variants,
      images: images.map((img) => img.url),
    }
  } catch (error) {
    console.error('Error fetching product by handle:', error)
    return null
  }
}

/**
 * Get all collections for product form
 */
export async function getCollectionsForSelect() {
  try {
    return await db
      .select({
        id: collections.id,
        title: collections.title,
        handle: collections.handle,
      })
      .from(collections)
      .orderBy(collections.title)
  } catch (error) {
    console.error('Error fetching collections:', error)
    return []
  }
}

/**
 * Get all categories for product form
 */
export async function getCategoriesForSelect() {
  try {
    return await db
      .select({
        id: categories.id,
        name: categories.name,
        handle: categories.handle,
      })
      .from(categories)
      .orderBy(categories.name)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

/**
 * Check if product handle is available
 */
export async function isHandleAvailable(handle: string, excludeId?: string) {
  try {
    let query = db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.handle, handle))
      .limit(1)

    const existing = await query

    if (excludeId && existing.length > 0) {
      return existing[0].id === excludeId
    }

    return existing.length === 0
  } catch (error) {
    console.error('Error checking handle availability:', error)
    return false
  }
}

/**
 * Get products with low stock
 */
export async function getLowStockProducts(threshold: number = 10) {
  try {
    // Join with product variants to get inventory quantities
    const { productVariants, stockLevels } = await import('@/db/schema')

    const lowStockProducts = await db
      .select({
        id: products.id,
        title: products.title,
        trackInventory: products.trackInventory,
        totalStock: sql<number>`COALESCE(SUM(${stockLevels.quantity}), 0)`,
        variantCount: sql<number>`COUNT(${productVariants.id})`,
      })
      .from(products)
      .leftJoin(productVariants, eq(products.id, productVariants.productId))
      .leftJoin(stockLevels, eq(productVariants.id, stockLevels.variantId))
      .where(
        and(eq(products.trackInventory, true), eq(products.status, 'active'))
      )
      .groupBy(products.id, products.title, products.trackInventory)
      .having(sql`COALESCE(SUM(${stockLevels.quantity}), 0) <= ${threshold}`)
      .orderBy(sql`COALESCE(SUM(${stockLevels.quantity}), 0)`)

    return lowStockProducts
  } catch (error) {
    console.error('Error fetching low stock products:', error)
    // Return empty array if there's an error (e.g., tables don't exist yet)
    return []
  }
}
