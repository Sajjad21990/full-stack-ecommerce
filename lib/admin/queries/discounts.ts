import { db } from '@/db'
import { discounts, discountProducts, discountCollections, discountUsages } from '@/db/schema/discounts'
import { products } from '@/db/schema/products'
import { collections } from '@/db/schema/collections'
import { eq, desc, and, or, ilike, gte, lte, sql, gt, lt } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

interface GetDiscountsParams {
  page?: number
  limit?: number
  search?: string
  type?: string
  status?: string
  dateFrom?: Date
  dateTo?: Date
  sortBy?: 'createdAt' | 'code' | 'usage' | 'endsAt'
  sortOrder?: 'asc' | 'desc'
}

export const getDiscounts = unstable_cache(
  async (params: GetDiscountsParams = {}) => {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params

    try {
      // Build where conditions
      const conditions = []

      if (search) {
        conditions.push(
          or(
            ilike(discounts.code, `%${search}%`),
            ilike(discounts.title, `%${search}%`)
          )
        )
      }

      if (type) {
        conditions.push(eq(discounts.type, type))
      }

      if (status) {
        conditions.push(eq(discounts.status, status))
      }

      if (dateFrom) {
        conditions.push(gte(discounts.createdAt, dateFrom))
      }

      if (dateTo) {
        conditions.push(lte(discounts.createdAt, dateTo))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get total count
      const totalCountResult = await db
        .select({ count: sql`count(*)` })
        .from(discounts)
        .where(whereClause)

      const totalCount = Number(totalCountResult[0].count)
      const totalPages = Math.ceil(totalCount / limit)
      const offset = (page - 1) * limit

      // Get discounts with related data
      const discountsData = await db
        .select({
          discount: discounts,
          usageCount: sql`
            (SELECT COUNT(*) FROM ${discountUsages} 
             WHERE ${discountUsages.discountId} = ${discounts.id})
          `,
          totalSaved: sql`
            (SELECT COALESCE(SUM(${discountUsages.discountAmount}), 0) 
             FROM ${discountUsages} 
             WHERE ${discountUsages.discountId} = ${discounts.id})
          `,
          products: sql`
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
                  'productId', ${discountProducts.productId},
                  'productTitle', ${products.title}
                )
              ) FILTER (WHERE ${discountProducts.productId} IS NOT NULL),
              '[]'::json
            )
          `,
          collections: sql`
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
                  'collectionId', ${discountCollections.collectionId},
                  'collectionTitle', ${collections.title}
                )
              ) FILTER (WHERE ${discountCollections.collectionId} IS NOT NULL),
              '[]'::json
            )
          `
        })
        .from(discounts)
        .leftJoin(discountProducts, eq(discountProducts.discountId, discounts.id))
        .leftJoin(products, eq(discountProducts.productId, products.id))
        .leftJoin(discountCollections, eq(discountCollections.discountId, discounts.id))
        .leftJoin(collections, eq(discountCollections.collectionId, collections.id))
        .where(whereClause)
        .groupBy(discounts.id)
        .orderBy(
          sortOrder === 'desc' 
            ? desc(discounts[sortBy as keyof typeof discounts])
            : discounts[sortBy as keyof typeof discounts]
        )
        .limit(limit)
        .offset(offset)

      // Update status for scheduled/expired discounts
      const now = new Date()
      for (const item of discountsData) {
        if (item.discount.status === 'scheduled' && item.discount.startsAt && item.discount.startsAt <= now) {
          await db.update(discounts)
            .set({ status: 'active' })
            .where(eq(discounts.id, item.discount.id))
          item.discount.status = 'active'
        }
        if (item.discount.status === 'active' && item.discount.endsAt && item.discount.endsAt <= now) {
          await db.update(discounts)
            .set({ status: 'expired' })
            .where(eq(discounts.id, item.discount.id))
          item.discount.status = 'expired'
        }
      }

      return {
        discounts: discountsData,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    } catch (error) {
      console.error('Error fetching discounts:', error)
      return {
        discounts: [],
        pagination: {
          page: 1,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      }
    }
  },
  ['admin-discounts'],
  {
    revalidate: 60,
    tags: ['admin-discounts']
  }
)

export const getDiscountById = unstable_cache(
  async (discountId: string) => {
    try {
      const discount = await db.query.discounts.findFirst({
        where: eq(discounts.id, discountId),
        with: {
          products: {
            with: {
              product: true
            }
          },
          collections: {
            with: {
              collection: true
            }
          },
          usages: {
            orderBy: (usages, { desc }) => [desc(usages.createdAt)],
            limit: 10
          }
        }
      })

      return discount
    } catch (error) {
      console.error('Error fetching discount:', error)
      return null
    }
  },
  ['admin-discount-by-id'],
  {
    revalidate: 60,
    tags: ['admin-discounts']
  }
)

export const getDiscountStats = unstable_cache(
  async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      const [
        totalDiscounts,
        activeDiscounts,
        scheduledDiscounts,
        expiredDiscounts,
        totalUsage,
        totalSaved,
        recentUsage,
        topDiscounts
      ] = await Promise.all([
        // Total discounts
        db.select({ count: sql`count(*)` }).from(discounts),
        
        // Active discounts
        db.select({ count: sql`count(*)` })
          .from(discounts)
          .where(
            and(
              eq(discounts.status, 'active'),
              or(
                sql`${discounts.endsAt} IS NULL`,
                gt(discounts.endsAt, today)
              )
            )
          ),
        
        // Scheduled discounts
        db.select({ count: sql`count(*)` })
          .from(discounts)
          .where(
            and(
              eq(discounts.status, 'scheduled'),
              gt(discounts.startsAt, today)
            )
          ),
        
        // Expired discounts
        db.select({ count: sql`count(*)` })
          .from(discounts)
          .where(eq(discounts.status, 'expired')),
        
        // Total usage all time
        db.select({ count: sql`count(*)` }).from(discountUsages),
        
        // Total saved all time
        db.select({ 
          total: sql`COALESCE(SUM(${discountUsages.discountAmount}), 0)` 
        }).from(discountUsages),
        
        // Recent usage (last 30 days)
        db.select({ count: sql`count(*)` })
          .from(discountUsages)
          .where(gte(discountUsages.createdAt, thirtyDaysAgo)),
        
        // Top performing discounts
        db.select({
          discountId: discountUsages.discountId,
          code: discounts.code,
          title: discounts.title,
          usageCount: sql`count(*)`,
          totalSaved: sql`sum(${discountUsages.discountAmount})`
        })
          .from(discountUsages)
          .leftJoin(discounts, eq(discountUsages.discountId, discounts.id))
          .where(gte(discountUsages.createdAt, thirtyDaysAgo))
          .groupBy(discountUsages.discountId, discounts.code, discounts.title)
          .orderBy(desc(sql`count(*)`))
          .limit(5)
      ])

      // Calculate conversion rate (rough estimate based on usage vs active discounts)
      const conversionRate = activeDiscounts[0].count > 0 
        ? (recentUsage[0].count / (activeDiscounts[0].count * 30)) * 100 
        : 0

      return {
        total: Number(totalDiscounts[0].count),
        active: Number(activeDiscounts[0].count),
        scheduled: Number(scheduledDiscounts[0].count),
        expired: Number(expiredDiscounts[0].count),
        totalUsage: Number(totalUsage[0].count),
        totalSaved: Number(totalSaved[0].total) || 0,
        recentUsage: Number(recentUsage[0].count),
        conversionRate: Math.min(100, conversionRate),
        topDiscounts: topDiscounts.map(d => ({
          ...d,
          usageCount: Number(d.usageCount),
          totalSaved: Number(d.totalSaved) || 0
        }))
      }
    } catch (error) {
      console.error('Error fetching discount stats:', error)
      return {
        total: 0,
        active: 0,
        scheduled: 0,
        expired: 0,
        totalUsage: 0,
        totalSaved: 0,
        recentUsage: 0,
        conversionRate: 0,
        topDiscounts: []
      }
    }
  },
  ['admin-discount-stats'],
  {
    revalidate: 300,
    tags: ['admin-discounts']
  }
)

export const validateDiscountCode = async (code: string, customerId?: string) => {
  try {
    const discount = await db.query.discounts.findFirst({
      where: and(
        eq(discounts.code, code.toUpperCase()),
        eq(discounts.status, 'active')
      )
    })

    if (!discount) {
      return { valid: false, error: 'Invalid discount code' }
    }

    const now = new Date()

    // Check if discount has started
    if (discount.startsAt && discount.startsAt > now) {
      return { valid: false, error: 'Discount has not started yet' }
    }

    // Check if discount has expired
    if (discount.endsAt && discount.endsAt < now) {
      return { valid: false, error: 'Discount has expired' }
    }

    // Check usage limit
    if (discount.usageLimit && discount.currentUsage >= discount.usageLimit) {
      return { valid: false, error: 'Discount usage limit reached' }
    }

    // Check customer usage limit
    if (customerId && discount.usageLimitPerCustomer) {
      const customerUsage = await db
        .select({ count: sql`count(*)` })
        .from(discountUsages)
        .where(
          and(
            eq(discountUsages.discountId, discount.id),
            eq(discountUsages.customerId, customerId)
          )
        )

      const usageCount = Number(customerUsage[0].count)
      
      if (usageCount >= discount.usageLimitPerCustomer) {
        return { valid: false, error: 'You have already used this discount' }
      }
    }

    // Check once per customer
    if (customerId && discount.oncePerCustomer) {
      const hasUsed = await db.query.discountUsages.findFirst({
        where: and(
          eq(discountUsages.discountId, discount.id),
          eq(discountUsages.customerId, customerId)
        )
      })

      if (hasUsed) {
        return { valid: false, error: 'This discount can only be used once per customer' }
      }
    }

    return { valid: true, discount }
  } catch (error) {
    console.error('Error validating discount:', error)
    return { valid: false, error: 'Error validating discount' }
  }
}