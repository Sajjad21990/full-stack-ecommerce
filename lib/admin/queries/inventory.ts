import { db } from '@/db'
import { eq, desc, asc, sum, sql, and, or } from 'drizzle-orm'
import { stockLevels, inventoryAdjustments, inventoryLocations } from '@/db/schema/inventory'
import { products, productVariants } from '@/db/schema/products'

export interface InventoryFilter {
  locationId?: string
  lowStock?: boolean
  outOfStock?: boolean
  search?: string
  sortBy?: 'title' | 'quantity' | 'reorderPoint' | 'lastRestocked'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface InventoryResponse {
  inventory: any[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/**
 * Get inventory levels with product information
 */
export async function getInventoryLevels(filters: InventoryFilter = {}): Promise<InventoryResponse> {
  const {
    locationId,
    lowStock,
    outOfStock,
    search,
    sortBy = 'title',
    sortOrder = 'asc',
    page = 1,
    limit = 50
  } = filters

  try {
    let query = db
      .select({
        id: stockLevels.id,
        variantId: stockLevels.variantId,
        locationId: stockLevels.locationId,
        quantity: stockLevels.quantity,
        reservedQuantity: stockLevels.reservedQuantity,
        incomingQuantity: stockLevels.incomingQuantity,
        reorderPoint: stockLevels.reorderPoint,
        reorderQuantity: stockLevels.reorderQuantity,
        lastRestockedAt: stockLevels.lastRestockedAt,
        lastSoldAt: stockLevels.lastSoldAt,
        // Product info
        productId: products.id,
        productTitle: products.title,
        productHandle: products.handle,
        variantTitle: productVariants.title,
        variantSku: productVariants.sku,
        // Location info
        locationName: inventoryLocations.name,
        locationCode: inventoryLocations.code,
      })
      .from(stockLevels)
      .leftJoin(productVariants, eq(stockLevels.variantId, productVariants.id))
      .leftJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(inventoryLocations, eq(stockLevels.locationId, inventoryLocations.id))

    // Apply filters
    const conditions = []
    
    if (locationId) {
      conditions.push(eq(stockLevels.locationId, locationId))
    }
    
    if (lowStock) {
      conditions.push(and(
        sql`${stockLevels.quantity} <= COALESCE(${stockLevels.reorderPoint}, 10)`,
        sql`${stockLevels.quantity} > 0`
      ))
    }
    
    if (outOfStock) {
      conditions.push(eq(stockLevels.quantity, 0))
    }
    
    if (search) {
      conditions.push(or(
        sql`${products.title} ILIKE ${'%' + search + '%'}`,
        sql`${productVariants.title} ILIKE ${'%' + search + '%'}`,
        sql`${productVariants.sku} ILIKE ${'%' + search + '%'}`
      ))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    // Apply sorting
    let orderColumn
    switch (sortBy) {
      case 'quantity':
        orderColumn = stockLevels.quantity
        break
      case 'reorderPoint':
        orderColumn = stockLevels.reorderPoint
        break
      case 'lastRestocked':
        orderColumn = stockLevels.lastRestockedAt
        break
      default:
        orderColumn = products.title
    }

    query = sortOrder === 'desc' ? 
      query.orderBy(desc(orderColumn)) : 
      query.orderBy(asc(orderColumn))

    // Get total count for pagination
    const totalQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(stockLevels)
      .leftJoin(productVariants, eq(stockLevels.variantId, productVariants.id))
      .leftJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(inventoryLocations, eq(stockLevels.locationId, inventoryLocations.id))

    if (conditions.length > 0) {
      totalQuery.where(and(...conditions))
    }

    const [inventoryResult, totalResult] = await Promise.all([
      query.limit(limit).offset((page - 1) * limit),
      totalQuery
    ])

    const total = totalResult[0]?.count || 0

    return {
      inventory: inventoryResult,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('Error fetching inventory levels:', error)
    return {
      inventory: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
      }
    }
  }
}

/**
 * Get low stock products for dashboard
 */
export async function getLowStockItems(threshold: number = 10) {
  try {
    return await db
      .select({
        id: stockLevels.id,
        variantId: stockLevels.variantId,
        quantity: stockLevels.quantity,
        reorderPoint: stockLevels.reorderPoint,
        productTitle: products.title,
        variantTitle: productVariants.title,
        variantSku: productVariants.sku,
        locationName: inventoryLocations.name,
      })
      .from(stockLevels)
      .leftJoin(productVariants, eq(stockLevels.variantId, productVariants.id))
      .leftJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(inventoryLocations, eq(stockLevels.locationId, inventoryLocations.id))
      .where(
        and(
          sql`${stockLevels.quantity} <= COALESCE(${stockLevels.reorderPoint}, ${threshold})`,
          sql`${stockLevels.quantity} >= 0`
        )
      )
      .orderBy(asc(stockLevels.quantity))
      .limit(20)
  } catch (error) {
    console.error('Error fetching low stock items:', error)
    return []
  }
}

/**
 * Get inventory adjustments history
 */
export async function getInventoryAdjustments(variantId?: string, locationId?: string, limit: number = 50) {
  try {
    let query = db
      .select({
        id: inventoryAdjustments.id,
        variantId: inventoryAdjustments.variantId,
        locationId: inventoryAdjustments.locationId,
        type: inventoryAdjustments.type,
        quantity: inventoryAdjustments.quantity,
        reason: inventoryAdjustments.reason,
        notes: inventoryAdjustments.notes,
        createdAt: inventoryAdjustments.createdAt,
        // Product info
        productTitle: products.title,
        variantTitle: productVariants.title,
        variantSku: productVariants.sku,
        // Location info
        locationName: inventoryLocations.name,
        locationCode: inventoryLocations.code,
      })
      .from(inventoryAdjustments)
      .leftJoin(productVariants, eq(inventoryAdjustments.variantId, productVariants.id))
      .leftJoin(products, eq(productVariants.productId, products.id))
      .leftJoin(inventoryLocations, eq(inventoryAdjustments.locationId, inventoryLocations.id))

    const conditions = []
    if (variantId) {
      conditions.push(eq(inventoryAdjustments.variantId, variantId))
    }
    if (locationId) {
      conditions.push(eq(inventoryAdjustments.locationId, locationId))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    return await query
      .orderBy(desc(inventoryAdjustments.createdAt))
      .limit(limit)
  } catch (error) {
    console.error('Error fetching inventory adjustments:', error)
    return []
  }
}

/**
 * Get inventory locations
 */
export async function getInventoryLocations() {
  try {
    return await db
      .select({
        id: inventoryLocations.id,
        name: inventoryLocations.name,
        code: inventoryLocations.code,
        type: inventoryLocations.type,
        isActive: inventoryLocations.isActive,
        isDefault: inventoryLocations.isDefault,
        fulfillsOnlineOrders: inventoryLocations.fulfillsOnlineOrders,
      })
      .from(inventoryLocations)
      .where(eq(inventoryLocations.isActive, true))
      .orderBy(
        desc(inventoryLocations.isDefault),
        asc(inventoryLocations.name)
      )
  } catch (error) {
    console.error('Error fetching inventory locations:', error)
    return []
  }
}

/**
 * Get inventory summary stats
 */
export async function getInventoryStats() {
  try {
    const [totalItems, lowStockCount, outOfStockCount, totalValue] = await Promise.all([
      // Total inventory items
      db.select({ count: sql<number>`count(*)` }).from(stockLevels),
      
      // Low stock items
      db.select({ count: sql<number>`count(*)` })
        .from(stockLevels)
        .where(
          and(
            sql`${stockLevels.quantity} <= COALESCE(${stockLevels.reorderPoint}, 10)`,
            sql`${stockLevels.quantity} > 0`
          )
        ),
      
      // Out of stock items
      db.select({ count: sql<number>`count(*)` })
        .from(stockLevels)
        .where(eq(stockLevels.quantity, 0)),
      
      // Total inventory value (using average cost)
      db.select({ 
        totalValue: sql<number>`COALESCE(sum(${stockLevels.quantity} * COALESCE(${stockLevels.averageCost}, 0)), 0)` 
      }).from(stockLevels)
    ])

    return {
      totalItems: totalItems[0]?.count || 0,
      lowStockCount: lowStockCount[0]?.count || 0,
      outOfStockCount: outOfStockCount[0]?.count || 0,
      totalValue: totalValue[0]?.totalValue || 0
    }
  } catch (error) {
    console.error('Error fetching inventory stats:', error)
    return {
      totalItems: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalValue: 0
    }
  }
}

/**
 * Get stock level for a specific variant at a location
 */
export async function getStockLevel(variantId: string, locationId: string) {
  try {
    return await db
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.variantId, variantId),
          eq(stockLevels.locationId, locationId)
        )
      )
      .limit(1)
      .then(rows => rows[0] || null)
  } catch (error) {
    console.error('Error fetching stock level:', error)
    return null
  }
}