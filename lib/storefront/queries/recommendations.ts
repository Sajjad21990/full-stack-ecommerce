import { db } from '@/db'
import { eq, and, inArray, sql, desc, ne, or } from 'drizzle-orm'
import { products, productVariants } from '@/db/schema/products'
import { collections, categories, productCollections, productCategories } from '@/db/schema/collections'
import { cache } from 'react'

export interface RecommendationOptions {
  limit?: number
  excludeIds?: string[]
  strategy?: 'similar' | 'popular' | 'cross-sell' | 'upsell'
}

/**
 * Get product recommendations based on a given product
 * Uses multiple strategies: collection-based, category-based, and price-based
 */
export const getProductRecommendations = cache(async (
  productId: string, 
  options: RecommendationOptions = {}
) => {
  const { limit = 8, excludeIds = [], strategy = 'similar' } = options
  const excludeList = [...excludeIds, productId]

  try {
    // Get the base product details
    const baseProduct = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        variants: {
          orderBy: [productVariants.position],
          limit: 1
        }
      }
    })

    if (!baseProduct) {
      return []
    }

    const basePrice = baseProduct.variants[0]?.price || baseProduct.price

    let recommendations: any[] = []

    switch (strategy) {
      case 'similar':
        recommendations = await getSimilarProducts(productId, baseProduct, excludeList, limit)
        break
      case 'popular':
        recommendations = await getPopularProducts(excludeList, limit)
        break
      case 'cross-sell':
        recommendations = await getCrossSellProducts(productId, baseProduct, excludeList, limit)
        break
      case 'upsell':
        recommendations = await getUpsellProducts(productId, baseProduct, basePrice, excludeList, limit)
        break
      default:
        recommendations = await getSimilarProducts(productId, baseProduct, excludeList, limit)
    }

    return recommendations.slice(0, limit)
  } catch (error) {
    console.error('Error getting product recommendations:', error)
    return []
  }
})

/**
 * Get similar products based on collections, categories, and product type
 */
async function getSimilarProducts(productId: string, baseProduct: any, excludeList: string[], limit: number) {
  // Get collections this product belongs to
  const productCollectionIds = await db.select({ collectionId: productCollections.collectionId })
    .from(productCollections)
    .where(eq(productCollections.productId, productId))

  // Get categories this product belongs to  
  const productCategoryIds = await db.select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, productId))

  // Build recommendation query with scoring
  const recommendations = await db.select({
    id: products.id,
    title: products.title,
    handle: products.handle,
    price: products.price,
    compareAtPrice: products.compareAtPrice,
    vendor: products.vendor,
    productType: products.productType,
    image: sql<string>`(
      SELECT pi.url 
      FROM product_images pi 
      WHERE pi.product_id = ${products.id} 
      ORDER BY pi.position 
      LIMIT 1
    )`,
    // Scoring system
    score: sql<number>`
      COALESCE((
        SELECT COUNT(*) * 10 
        FROM ${productCollections} pc 
        WHERE pc.product_id = ${products.id} 
        AND pc.collection_id = ANY(${productCollectionIds.map(c => c.collectionId)})
      ), 0) +
      COALESCE((
        SELECT COUNT(*) * 8
        FROM ${productCategories} pcat
        WHERE pcat.product_id = ${products.id}
        AND pcat.category_id = ANY(${productCategoryIds.map(c => c.categoryId)})
      ), 0) +
      CASE 
        WHEN ${products.productType} = ${baseProduct.productType} THEN 6
        WHEN ${products.vendor} = ${baseProduct.vendor} THEN 4
        ELSE 0
      END
    `,
    inStock: sql<boolean>`
      EXISTS(
        SELECT 1 FROM ${productVariants} pv 
        WHERE pv.product_id = ${products.id} 
        AND pv.inventory_quantity > 0
      )
    `
  })
  .from(products)
  .where(and(
    eq(products.status, 'active'),
    sql`${products.id} != ALL(${excludeList})`
  ))
  .having(sql`score > 0`)
  .orderBy(sql`score DESC, ${products.createdAt} DESC`)
  .limit(limit * 2) // Get more to filter

  return recommendations.filter(p => p.inStock).slice(0, limit)
}

/**
 * Get popular products based on recent creation and availability
 */
async function getPopularProducts(excludeList: string[], limit: number) {
  return await db.select({
    id: products.id,
    title: products.title,
    handle: products.handle,
    price: products.price,
    compareAtPrice: products.compareAtPrice,
    vendor: products.vendor,
    productType: products.productType,
    image: sql<string>`(
      SELECT pi.url 
      FROM product_images pi 
      WHERE pi.product_id = ${products.id} 
      ORDER BY pi.position 
      LIMIT 1
    )`,
    inStock: sql<boolean>`
      EXISTS(
        SELECT 1 FROM ${productVariants} pv 
        WHERE pv.product_id = ${products.id} 
        AND pv.inventory_quantity > 0
      )
    `
  })
  .from(products)
  .where(and(
    eq(products.status, 'active'),
    sql`${products.id} != ALL(${excludeList})`
  ))
  .orderBy(desc(products.createdAt))
  .limit(limit * 2)
}

/**
 * Get cross-sell products (frequently bought together)
 * For now, uses similar logic but could be enhanced with order history
 */
async function getCrossSellProducts(productId: string, baseProduct: any, excludeList: string[], limit: number) {
  // Similar to getSimilarProducts but with different weighting
  return getSimilarProducts(productId, baseProduct, excludeList, limit)
}

/**
 * Get upsell products (higher priced alternatives)
 */
async function getUpsellProducts(productId: string, baseProduct: any, basePrice: number, excludeList: string[], limit: number) {
  const minPrice = Math.floor(basePrice * 1.2) // 20% higher minimum
  const maxPrice = Math.floor(basePrice * 3) // Up to 3x the price

  return await db.select({
    id: products.id,
    title: products.title,
    handle: products.handle,
    price: products.price,
    compareAtPrice: products.compareAtPrice,
    vendor: products.vendor,
    productType: products.productType,
    image: sql<string>`(
      SELECT pi.url 
      FROM product_images pi 
      WHERE pi.product_id = ${products.id} 
      ORDER BY pi.position 
      LIMIT 1
    )`,
    inStock: sql<boolean>`
      EXISTS(
        SELECT 1 FROM ${productVariants} pv 
        WHERE pv.product_id = ${products.id} 
        AND pv.inventory_quantity > 0
      )
    `,
    priceMultiplier: sql<number>`${products.price} / ${basePrice}`
  })
  .from(products)
  .where(and(
    eq(products.status, 'active'),
    sql`${products.id} != ALL(${excludeList})`,
    sql`${products.price} >= ${minPrice}`,
    sql`${products.price} <= ${maxPrice}`,
    // Same category or type preferred
    or(
      eq(products.productType, baseProduct.productType),
      eq(products.vendor, baseProduct.vendor)
    )
  ))
  .orderBy(sql`price_multiplier ASC, ${products.createdAt} DESC`)
  .limit(limit)
}

/**
 * Get cart-based recommendations (for products often bought together)
 */
export async function getCartRecommendations(cartItemIds: string[], limit: number = 4) {
  if (cartItemIds.length === 0) return []

  try {
    // Get recommendations based on all products in cart
    const allRecommendations = await Promise.all(
      cartItemIds.map(productId => 
        getProductRecommendations(productId, {
          limit: Math.ceil(limit / cartItemIds.length) + 2,
          excludeIds: cartItemIds,
          strategy: 'cross-sell'
        })
      )
    )

    // Flatten and deduplicate
    const flatRecommendations = allRecommendations.flat()
    const uniqueRecommendations = flatRecommendations.filter((product, index, self) =>
      self.findIndex(p => p.id === product.id) === index
    )

    // Sort by relevance (could be enhanced with actual scoring)
    return uniqueRecommendations
      .sort(() => Math.random() - 0.5) // Randomize for now
      .slice(0, limit)
  } catch (error) {
    console.error('Error getting cart recommendations:', error)
    return []
  }
}

/**
 * Get trending products (most recently added active products)
 */
export const getTrendingProducts = cache(async (limit: number = 12) => {
  try {
    return await db.select({
      id: products.id,
      title: products.title,
      handle: products.handle,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      vendor: products.vendor,
      productType: products.productType,
      image: sql<string>`(
        SELECT pi.url 
        FROM product_images pi 
        WHERE pi.product_id = ${products.id} 
        ORDER BY pi.position 
        LIMIT 1
      )`,
      inStock: sql<boolean>`
        EXISTS(
          SELECT 1 FROM ${productVariants} pv 
          WHERE pv.product_id = ${products.id} 
          AND pv.inventory_quantity > 0
        )
      `
    })
    .from(products)
    .where(eq(products.status, 'active'))
    .orderBy(desc(products.createdAt))
    .limit(limit * 2) // Get more to filter for stock
  } catch (error) {
    console.error('Error getting trending products:', error)
    return []
  }
})

/**
 * Get personalized recommendations based on user behavior
 * For now returns popular products, but could be enhanced with user data
 */
export async function getPersonalizedRecommendations(
  userId?: string,
  recentlyViewedIds: string[] = [],
  limit: number = 8
) {
  try {
    // If user has recently viewed products, use them for recommendations
    if (recentlyViewedIds.length > 0) {
      const recommendations = await Promise.all(
        recentlyViewedIds.slice(0, 3).map(productId => 
          getProductRecommendations(productId, {
            limit: Math.ceil(limit / Math.min(recentlyViewedIds.length, 3)),
            excludeIds: recentlyViewedIds,
            strategy: 'similar'
          })
        )
      )
      
      const flattened = recommendations.flat()
      const unique = flattened.filter((product, index, self) =>
        self.findIndex(p => p.id === product.id) === index
      )
      
      if (unique.length >= limit) {
        return unique.slice(0, limit)
      }
      
      // Fill remaining with popular products
      const popular = await getPopularProducts(
        [...recentlyViewedIds, ...unique.map(p => p.id)], 
        limit - unique.length
      )
      
      return [...unique, ...popular].slice(0, limit)
    }

    // Fallback to popular products
    return await getPopularProducts([], limit)
  } catch (error) {
    console.error('Error getting personalized recommendations:', error)
    return []
  }
}