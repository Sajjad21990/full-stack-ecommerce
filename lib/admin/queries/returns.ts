import { db } from '@/db'
import { returns, returnItems, orders, orderItems } from '@/db/schema/orders'
import { customers } from '@/db/schema/customers'
import { productVariants, products } from '@/db/schema/products'
import { eq, desc, and, or, ilike, gte, lte, sql } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

interface GetReturnsParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  reason?: string
  dateFrom?: Date
  dateTo?: Date
  sortBy?: 'createdAt' | 'returnNumber' | 'status'
  sortOrder?: 'asc' | 'desc'
}

export const getReturns = unstable_cache(
  async (params: GetReturnsParams = {}) => {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      reason,
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
            ilike(returns.returnNumber, `%${search}%`),
            ilike(orders.orderNumber, `%${search}%`),
            ilike(orders.email, `%${search}%`)
          )
        )
      }

      if (status) {
        conditions.push(eq(returns.status, status))
      }

      if (reason) {
        conditions.push(eq(returns.reason, reason))
      }

      if (dateFrom) {
        conditions.push(gte(returns.createdAt, dateFrom))
      }

      if (dateTo) {
        conditions.push(lte(returns.createdAt, dateTo))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get total count
      const totalCountResult = await db
        .select({ count: sql`count(*)` })
        .from(returns)
        .leftJoin(orders, eq(returns.orderId, orders.id))
        .where(whereClause)

      const totalCount = Number(totalCountResult[0].count)
      const totalPages = Math.ceil(totalCount / limit)
      const offset = (page - 1) * limit

      // Get returns with related data
      const returnsData = await db
        .select({
          return: returns,
          order: orders,
          customer: customers,
          items: sql`
            COALESCE(
              json_agg(
                json_build_object(
                  'id', ${returnItems.id},
                  'quantity', ${returnItems.quantity},
                  'reason', ${returnItems.reason},
                  'restockable', ${returnItems.restockable},
                  'orderItem', json_build_object(
                    'id', ${orderItems.id},
                    'productTitle', ${orderItems.productTitle},
                    'variantTitle', ${orderItems.variantTitle},
                    'sku', ${orderItems.sku},
                    'price', ${orderItems.price}
                  )
                )
              ) FILTER (WHERE ${returnItems.id} IS NOT NULL),
              '[]'::json
            )
          `
        })
        .from(returns)
        .leftJoin(orders, eq(returns.orderId, orders.id))
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .leftJoin(returnItems, eq(returnItems.returnId, returns.id))
        .leftJoin(orderItems, eq(returnItems.orderItemId, orderItems.id))
        .where(whereClause)
        .groupBy(returns.id, orders.id, customers.id)
        .orderBy(
          sortOrder === 'desc' 
            ? desc(returns[sortBy as keyof typeof returns])
            : returns[sortBy as keyof typeof returns]
        )
        .limit(limit)
        .offset(offset)

      return {
        returns: returnsData,
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
      console.error('Error fetching returns:', error)
      return {
        returns: [],
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
  ['admin-returns'],
  {
    revalidate: 60,
    tags: ['admin-returns']
  }
)

export const getReturnById = unstable_cache(
  async (returnId: string) => {
    try {
      const returnData = await db.query.returns.findFirst({
        where: eq(returns.id, returnId),
        with: {
          order: {
            with: {
              customer: true,
              items: true,
              payments: true
            }
          },
          items: {
            with: {
              orderItem: {
                with: {
                  variant: {
                    with: {
                      product: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      return returnData
    } catch (error) {
      console.error('Error fetching return:', error)
      return null
    }
  },
  ['admin-return-by-id'],
  {
    revalidate: 60,
    tags: ['admin-returns']
  }
)

export const getReturnStats = unstable_cache(
  async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      thirtyDaysAgo.setHours(0, 0, 0, 0)

      // Get various stats
      const [
        totalReturns,
        pendingReturns,
        approvedReturns,
        processedReturns,
        returnsByReason,
        recentReturns
      ] = await Promise.all([
        // Total returns
        db.select({ count: sql`count(*)` }).from(returns),
        
        // Pending returns
        db.select({ count: sql`count(*)` })
          .from(returns)
          .where(eq(returns.status, 'requested')),
        
        // Approved returns
        db.select({ count: sql`count(*)` })
          .from(returns)
          .where(eq(returns.status, 'approved')),
        
        // Processed returns
        db.select({ count: sql`count(*)` })
          .from(returns)
          .where(eq(returns.status, 'processed')),
        
        // Returns by reason
        db.select({
          reason: returns.reason,
          count: sql`count(*)`
        })
          .from(returns)
          .where(gte(returns.createdAt, thirtyDaysAgo))
          .groupBy(returns.reason),
        
        // Recent returns (last 30 days)
        db.select({ count: sql`count(*)` })
          .from(returns)
          .where(gte(returns.createdAt, thirtyDaysAgo))
      ])

      // Calculate return value
      const returnValue = await db
        .select({
          totalValue: sql`
            COALESCE(SUM(${orderItems.price} * ${returnItems.quantity}), 0)
          `
        })
        .from(returns)
        .leftJoin(returnItems, eq(returnItems.returnId, returns.id))
        .leftJoin(orderItems, eq(returnItems.orderItemId, orderItems.id))
        .where(
          and(
            eq(returns.status, 'processed'),
            gte(returns.createdAt, thirtyDaysAgo)
          )
        )

      return {
        total: Number(totalReturns[0].count),
        pending: Number(pendingReturns[0].count),
        approved: Number(approvedReturns[0].count),
        processed: Number(processedReturns[0].count),
        recentCount: Number(recentReturns[0].count),
        returnValue: Number(returnValue[0].totalValue) || 0,
        byReason: returnsByReason.map(r => ({
          reason: r.reason,
          count: Number(r.count)
        }))
      }
    } catch (error) {
      console.error('Error fetching return stats:', error)
      return {
        total: 0,
        pending: 0,
        approved: 0,
        processed: 0,
        recentCount: 0,
        returnValue: 0,
        byReason: []
      }
    }
  },
  ['admin-return-stats'],
  {
    revalidate: 300,
    tags: ['admin-returns']
  }
)