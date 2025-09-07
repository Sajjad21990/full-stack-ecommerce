import { db } from '@/db'
import { eq, and, inArray, gte, lte, ilike, sql, desc, asc, or } from 'drizzle-orm'
import { products, productVariants, productOptions, optionValues, productImages } from '@/db/schema/products'
import { collections, categories, productCollections, productCategories } from '@/db/schema/collections'
import { cache } from 'react'

export interface ProductFilter {
  minPrice?: number
  maxPrice?: number
  vendor?: string[]
  productType?: string[]
  inStock?: boolean
  sortBy?: 'price-asc' | 'price-desc' | 'title-asc' | 'title-desc' | 'created-desc' | 'created-asc'
}

/**
 * Get a single product by handle with all its data
 * Cached for performance
 */
export const getProductByHandle = cache(async (handle: string) => {
  try {
    // Get product with variants
    const product = await db.query.products.findFirst({
      where: and(
        eq(products.handle, handle),
        eq(products.status, 'active')
      ),
      with: {
        variants: {
          orderBy: [asc(productVariants.position)]
        },
        images: {
          orderBy: [asc(productImages.position)]
        }
      }
    })

    if (!product) {
      return null
    }

    // Get product options
    const productOptionsData = await db.select({
      id: productOptions.id,
      name: productOptions.name,
      position: productOptions.position
    })
    .from(productOptions)
    .where(eq(productOptions.productId, product.id))
    .orderBy(asc(productOptions.position))

    // Get option values for each option
    const optionValuesData = productOptionsData.length > 0
      ? await db.select({
          optionId: optionValues.optionId,
          value: optionValues.value,
          position: optionValues.position
        })
        .from(optionValues)
        .where(inArray(optionValues.optionId, productOptionsData.map(o => o.id)))
        .orderBy(asc(optionValues.position))
      : []

    // Get related products (same collection or category)
    const relatedProducts = await getRelatedProducts(product.id, 4)

    return {
      ...product,
      options: groupOptionsWithValues(productOptionsData, optionValuesData),
      relatedProducts
    }
  } catch (error) {
    console.error('Error fetching product:', error)
    return null
  }
})

/**
 * Get products for a collection
 */
export async function getCollectionProducts(
  collectionHandle: string,
  filters: ProductFilter = {},
  page: number = 1,
  limit: number = 12
) {
  try {
    // Get collection
    const collection = await db.query.collections.findFirst({
      where: and(
        eq(collections.handle, collectionHandle),
        eq(collections.status, 'active')
      )
    })

    if (!collection) {
      return { products: [], pagination: null, collection: null }
    }

    // Build filter conditions
    const conditions = [eq(products.status, 'active')]

    // Get product IDs in this collection
    const collectionProducts = await db.select({ productId: productCollections.productId })
      .from(productCollections)
      .where(eq(productCollections.collectionId, collection.id))

    if (collectionProducts.length === 0) {
      return { products: [], pagination: null, collection }
    }

    conditions.push(inArray(products.id, collectionProducts.map(p => p.productId)))

    // Apply filters
    if (filters.minPrice !== undefined) {
      conditions.push(gte(products.price, filters.minPrice))
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(lte(products.price, filters.maxPrice))
    }
    if (filters.vendor?.length) {
      conditions.push(inArray(products.vendor, filters.vendor))
    }
    if (filters.productType?.length) {
      conditions.push(inArray(products.productType, filters.productType))
    }

    // Apply sorting
    let orderBy = desc(products.createdAt)
    switch (filters.sortBy) {
      case 'price-asc':
        orderBy = asc(products.price)
        break
      case 'price-desc':
        orderBy = desc(products.price)
        break
      case 'title-asc':
        orderBy = asc(products.title)
        break
      case 'title-desc':
        orderBy = desc(products.title)
        break
      case 'created-asc':
        orderBy = asc(products.createdAt)
        break
    }

    // Get paginated products
    const [productsData, totalCount] = await Promise.all([
      db.select({
        id: products.id,
        title: products.title,
        handle: products.handle,
        description: products.description,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        vendor: products.vendor,
        productType: products.productType,
        tags: products.tags,
        createdAt: products.createdAt
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset((page - 1) * limit),

      db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...conditions))
    ])

    // Get first variant for each product (for pricing display)
    const productIds = productsData.map(p => p.id)
    const firstVariants = productIds.length > 0 
      ? await db.select({
          productId: productVariants.productId,
          price: productVariants.price,
          compareAtPrice: productVariants.compareAtPrice,
          inventoryQuantity: productVariants.inventoryQuantity
        })
        .from(productVariants)
        .where(inArray(productVariants.productId, productIds))
        .groupBy(productVariants.productId, productVariants.price, productVariants.compareAtPrice, productVariants.inventoryQuantity)
      : []

    // Combine products with their first variant
    const productsWithVariants = productsData.map(product => {
      const variant = firstVariants.find(v => v.productId === product.id)
      return {
        ...product,
        price: variant?.price || product.price,
        compareAtPrice: variant?.compareAtPrice || product.compareAtPrice,
        inStock: variant ? variant.inventoryQuantity > 0 : false
      }
    })

    // Apply in-stock filter if needed
    const finalProducts = filters.inStock 
      ? productsWithVariants.filter(p => p.inStock)
      : productsWithVariants

    const total = totalCount[0]?.count || 0
    const totalPages = Math.ceil(total / limit)

    return {
      products: finalProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      collection
    }
  } catch (error) {
    console.error('Error fetching collection products:', error)
    return { products: [], pagination: null, collection: null }
  }
}

/**
 * Get featured products for homepage
 */
export const getFeaturedProducts = cache(async (limit: number = 8) => {
  try {
    const featuredProducts = await db.select({
      id: products.id,
      title: products.title,
      handle: products.handle,
      description: products.description,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      vendor: products.vendor,
      productType: products.productType,
      tags: products.tags,
      images: products.images,
      createdAt: products.createdAt
    })
    .from(products)
    .where(eq(products.status, 'active'))
    .orderBy(desc(products.createdAt))
    .limit(limit)

    // Get first variant for pricing
    const productIds = featuredProducts.map(p => p.id)
    const firstVariants = productIds.length > 0
      ? await db.select({
          productId: productVariants.productId,
          price: productVariants.price,
          compareAtPrice: productVariants.compareAtPrice,
          inventoryQuantity: productVariants.inventoryQuantity
        })
        .from(productVariants)
        .where(inArray(productVariants.productId, productIds))
        .groupBy(productVariants.productId, productVariants.price, productVariants.compareAtPrice, productVariants.inventoryQuantity)
      : []

    return featuredProducts.map(product => {
      const variant = firstVariants.find(v => v.productId === product.id)
      return {
        ...product,
        price: variant?.price || product.price,
        compareAtPrice: variant?.compareAtPrice || product.compareAtPrice,
        inStock: variant ? variant.inventoryQuantity > 0 : false
      }
    })
  } catch (error) {
    console.error('Error fetching featured products:', error)
    return []
  }
})

/**
 * Search products with filters
 */
export async function searchProducts(
  query: string = '',
  filters: ProductFilter = {},
  page: number = 1,
  limit: number = 12
) {
  try {
    const offset = (page - 1) * limit
    let searchTerm = ''
    
    // Build search conditions
    const conditions = [
      eq(products.status, 'active')
    ]

    // Text search
    if (query && query.trim().length > 0) {
      searchTerm = `%${query.trim()}%`
      conditions.push(
        or(
          ilike(products.title, searchTerm),
          ilike(products.description, searchTerm),
          ilike(products.vendor, searchTerm),
          sql`${products.tags} && ARRAY[${searchTerm}]::text[]`
        )!
      )
    }

    // Price filters
    if (filters.minPrice !== undefined) {
      conditions.push(gte(products.price, filters.minPrice))
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(lte(products.price, filters.maxPrice))
    }

    // Vendor filter
    if (filters.vendor && filters.vendor.length > 0) {
      conditions.push(inArray(products.vendor, filters.vendor))
    }

    // Product type filter
    if (filters.productType && filters.productType.length > 0) {
      conditions.push(inArray(products.productType, filters.productType))
    }

    // Sort options
    let orderBy
    switch (filters.sortBy) {
      case 'price-asc':
        orderBy = asc(products.price)
        break
      case 'price-desc':
        orderBy = desc(products.price)
        break
      case 'title-asc':
        orderBy = asc(products.title)
        break
      case 'title-desc':
        orderBy = desc(products.title)
        break
      case 'created-desc':
        orderBy = desc(products.createdAt)
        break
      case 'created-asc':
        orderBy = asc(products.createdAt)
        break
      default:
        orderBy = desc(products.createdAt) // Default sort
    }

    // Get products and total count
    const [productsData, totalCountResult] = await Promise.all([
      db.select({
        id: products.id,
        title: products.title,
        handle: products.handle,
        description: products.description,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        vendor: products.vendor,
        productType: products.productType,
        tags: products.tags,
        createdAt: products.createdAt
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset),

      db.select({ count: sql<number>`count(*)` })
        .from(products)
        .where(and(...conditions))
    ])

    const total = totalCountResult[0]?.count || 0
    const totalPages = Math.ceil(total / limit)

    return {
      products: productsData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  } catch (error) {
    console.error('Error searching products:', error)
    return { products: [], pagination: null }
  }
}

/**
 * Get all active collections
 */
export async function getProductsWithFilters(
  filters?: ProductFilter,
  page: number = 1,
  limit: number = 12
) {
  try {
    const offset = (page - 1) * limit
    
    let query = db
      .select({
        id: products.id,
        title: products.title,
        handle: products.handle,
        description: products.description,
        price: products.price,
        compareAtPrice: products.compareAtPrice,
        vendor: products.vendor,
        productType: products.productType,
        tags: products.tags,
        status: products.status,
        images: sql<string[]>`
          COALESCE(
            array_agg(
              DISTINCT jsonb_build_object(
                'id', ${productImages.id},
                'url', ${productImages.url},
                'altText', ${productImages.altText},
                'position', ${productImages.position}
              ) ORDER BY ${productImages.position}
            ) FILTER (WHERE ${productImages.id} IS NOT NULL),
            '{}'::jsonb[]
          )`
      })
      .from(products)
      .leftJoin(productImages, eq(products.id, productImages.productId))
      .where(eq(products.status, 'active'))
      .groupBy(products.id)

    // Apply filters
    const conditions = [eq(products.status, 'active')]
    
    if (filters?.minPrice !== undefined) {
      conditions.push(gte(products.price, filters.minPrice))
    }
    
    if (filters?.maxPrice !== undefined) {
      conditions.push(lte(products.price, filters.maxPrice))
    }
    
    if (filters?.vendor && filters.vendor.length > 0) {
      conditions.push(inArray(products.vendor, filters.vendor))
    }
    
    if (filters?.productType && filters.productType.length > 0) {
      conditions.push(inArray(products.productType, filters.productType))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Apply sorting
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'price-asc':
          query = query.orderBy(asc(products.price))
          break
        case 'price-desc':
          query = query.orderBy(desc(products.price))
          break
        case 'title-asc':
          query = query.orderBy(asc(products.title))
          break
        case 'title-desc':
          query = query.orderBy(desc(products.title))
          break
        case 'created-asc':
          query = query.orderBy(asc(products.createdAt))
          break
        case 'created-desc':
        default:
          query = query.orderBy(desc(products.createdAt))
          break
      }
    } else {
      query = query.orderBy(desc(products.createdAt))
    }

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(and(...conditions))
    
    const [{ count }] = await countQuery
    const totalPages = Math.ceil(count / limit)

    // Apply pagination
    const results = await query.limit(limit).offset(offset)

    return {
      products: results,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  } catch (error) {
    console.error('Error fetching products with filters:', error)
    return {
      products: [],
      pagination: null
    }
  }
}

export const getAllCollections = cache(async () => {
  try {
    const collectionsData = await db.select({
      id: collections.id,
      title: collections.title,
      handle: collections.handle,
      description: collections.description,
      image: collections.image,
      productCount: sql<number>`(
        SELECT COUNT(*) 
        FROM ${productCollections} 
        WHERE ${productCollections.collectionId} = ${collections.id}
      )`
    })
    .from(collections)
    .where(eq(collections.status, 'active'))
    .orderBy(asc(collections.position))

    return collectionsData
  } catch (error) {
    console.error('Error fetching collections:', error)
    return []
  }
})

/**
 * Get related products
 */
async function getRelatedProducts(productId: string, limit: number = 4) {
  try {
    // Get collections this product belongs to
    const productCollectionIds = await db.select({ collectionId: productCollections.collectionId })
      .from(productCollections)
      .where(eq(productCollections.productId, productId))

    if (productCollectionIds.length === 0) {
      return []
    }

    // Get other products from the same collections
    const relatedProductIds = await db.select({ productId: productCollections.productId })
      .from(productCollections)
      .where(and(
        inArray(productCollections.collectionId, productCollectionIds.map(c => c.collectionId)),
        sql`${productCollections.productId} != ${productId}`
      ))
      .limit(limit * 2) // Get more to filter

    if (relatedProductIds.length === 0) {
      return []
    }

    // Get product details
    const relatedProducts = await db.select({
      id: products.id,
      title: products.title,
      handle: products.handle,
      price: products.price,
      compareAtPrice: products.compareAtPrice
    })
    .from(products)
    .where(and(
      eq(products.status, 'active'),
      inArray(products.id, relatedProductIds.map(p => p.productId))
    ))
    .limit(limit)

    return relatedProducts
  } catch (error) {
    console.error('Error fetching related products:', error)
    return []
  }
}

/**
 * Group product options with values
 */
function groupOptionsWithValues(options: any[], values: any[]) {
  return options.map(option => ({
    id: option.id,
    name: option.name,
    position: option.position,
    values: values
      .filter(v => v.optionId === option.id)
      .map(v => ({
        id: `${option.id}-${v.value}`, // Create a synthetic ID
        value: v.value,
        position: v.position
      }))
      .sort((a, b) => a.position - b.position)
  })).sort((a, b) => a.position - b.position)
}