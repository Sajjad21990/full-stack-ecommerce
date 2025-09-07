import { db } from '@/db'
import { payments, orders, customers } from '@/db/schema'
import { eq, desc, asc, like, or, and, gte, lte, sql, inArray } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

interface PaymentFilters {
  page?: number
  limit?: number
  search?: string
  status?: 'pending' | 'captured' | 'failed' | 'refunded' | 'cancelled' | 'authorized'
  gateway?: string
  paymentMethod?: string
  dateFrom?: Date
  dateTo?: Date
  sortBy?: 'createdAt' | 'amount' | 'status'
  sortOrder?: 'asc' | 'desc'
  minAmount?: number
  maxAmount?: number
}

export async function getPayments(filters: PaymentFilters = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    gateway,
    paymentMethod,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    minAmount,
    maxAmount
  } = filters

  try {
    // Build where conditions
    const conditions = []

    if (search) {
      conditions.push(
        or(
          like(payments.gatewayTransactionId, `%${search}%`),
          like(orders.orderNumber, `%${search}%`),
          like(customers.email, `%${search}%`)
        )
      )
    }

    if (status) {
      conditions.push(eq(payments.status, status))
    }

    if (gateway) {
      conditions.push(eq(payments.gateway, gateway))
    }

    if (paymentMethod) {
      conditions.push(eq(payments.paymentMethod, paymentMethod))
    }

    if (dateFrom) {
      conditions.push(gte(payments.createdAt, dateFrom))
    }

    if (dateTo) {
      conditions.push(lte(payments.createdAt, dateTo))
    }

    if (minAmount !== undefined) {
      conditions.push(gte(payments.amount, minAmount))
    }

    if (maxAmount !== undefined) {
      conditions.push(lte(payments.amount, maxAmount))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .leftJoin(orders, eq(orders.id, payments.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(whereClause)

    const total = Number(totalResult[0]?.count || 0)
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit

    // Build order by clause
    let orderByClause
    switch (sortBy) {
      case 'amount':
        orderByClause = sortOrder === 'desc' ? desc(payments.amount) : asc(payments.amount)
        break
      case 'status':
        orderByClause = sortOrder === 'desc' ? desc(payments.status) : asc(payments.status)
        break
      default:
        orderByClause = sortOrder === 'desc' ? desc(payments.createdAt) : asc(payments.createdAt)
    }

    // Get payments with related data
    const paymentsData = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        paymentMethod: payments.paymentMethod,
        failureMessage: payments.failureMessage,
        refundedAt: payments.refundedAt,
        refundReason: payments.refundReason,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        // Order data
        orderNumber: orders.orderNumber,
        orderStatus: orders.status,
        orderTotal: orders.totalAmount,
        // Customer data
        customerName: customers.name,
        customerEmail: customers.email
      })
      .from(payments)
      .leftJoin(orders, eq(orders.id, payments.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset)

    return {
      payments: paymentsData,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    }
  } catch (error) {
    console.error('Error fetching payments:', error)
    throw error
  }
}

export async function getPaymentById(paymentId: string) {
  try {
    const payment = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        paymentMethod: payments.paymentMethod,
        failureMessage: payments.failureMessage,
        refundedAt: payments.refundedAt,
        refundReason: payments.refundReason,
        metadata: payments.metadata,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
        // Order data
        orderNumber: orders.orderNumber,
        orderStatus: orders.status,
        orderTotal: orders.totalAmount,
        // Customer data
        customerId: customers.id,
        customerName: customers.name,
        customerEmail: customers.email
      })
      .from(payments)
      .leftJoin(orders, eq(orders.id, payments.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(payments.id, paymentId))
      .then(rows => rows[0])

    return payment
  } catch (error) {
    console.error('Error fetching payment:', error)
    throw error
  }
}

export async function getPaymentStats() {
  try {
    const stats = await db
      .select({
        totalTransactions: sql<number>`count(*)`,
        successfulTransactions: sql<number>`count(case when ${payments.status} = 'captured' then 1 end)`,
        failedTransactions: sql<number>`count(case when ${payments.status} = 'failed' then 1 end)`,
        pendingTransactions: sql<number>`count(case when ${payments.status} = 'pending' then 1 end)`,
        refundedTransactions: sql<number>`count(case when ${payments.status} = 'refunded' then 1 end)`,
        totalVolume: sql<number>`coalesce(sum(case when ${payments.status} = 'captured' then ${payments.amount} else 0 end), 0)`,
        totalRefunded: sql<number>`coalesce(sum(case when ${payments.status} = 'refunded' then abs(${payments.amount}) else 0 end), 0)`,
        todayVolume: sql<number>`coalesce(sum(case when date(${payments.createdAt}) = current_date and ${payments.status} = 'captured' then ${payments.amount} else 0 end), 0)`,
        monthVolume: sql<number>`coalesce(sum(case when date_trunc('month', ${payments.createdAt}) = date_trunc('month', current_date) and ${payments.status} = 'captured' then ${payments.amount} else 0 end), 0)`,
        todayTransactions: sql<number>`count(case when date(${payments.createdAt}) = current_date then 1 end)`,
        monthTransactions: sql<number>`count(case when date_trunc('month', ${payments.createdAt}) = date_trunc('month', current_date) then 1 end)`
      })
      .from(payments)

    // Get success rate
    const successRate = stats[0].totalTransactions > 0 
      ? (stats[0].successfulTransactions / stats[0].totalTransactions) * 100 
      : 0

    // Get payment method distribution
    const paymentMethods = await db
      .select({
        method: payments.paymentMethod,
        count: sql<number>`count(*)`,
        volume: sql<number>`coalesce(sum(case when ${payments.status} = 'captured' then ${payments.amount} else 0 end), 0)`
      })
      .from(payments)
      .where(eq(payments.status, 'captured'))
      .groupBy(payments.paymentMethod)
      .orderBy(desc(sql`count(*)`))

    // Get gateway distribution
    const gateways = await db
      .select({
        gateway: payments.gateway,
        count: sql<number>`count(*)`,
        volume: sql<number>`coalesce(sum(case when ${payments.status} = 'captured' then ${payments.amount} else 0 end), 0)`,
        successRate: sql<number>`round((count(case when ${payments.status} = 'captured' then 1 end) * 100.0 / count(*)), 2)`
      })
      .from(payments)
      .groupBy(payments.gateway)
      .orderBy(desc(sql`volume`))

    // Get daily volume trend (last 30 days)
    const dailyTrend = await db
      .select({
        date: sql<string>`date(${payments.createdAt})`,
        volume: sql<number>`coalesce(sum(case when ${payments.status} = 'captured' then ${payments.amount} else 0 end), 0)`,
        transactions: sql<number>`count(case when ${payments.status} = 'captured' then 1 end)`
      })
      .from(payments)
      .where(gte(payments.createdAt, sql`current_date - interval '30 days'`))
      .groupBy(sql`date(${payments.createdAt})`)
      .orderBy(asc(sql`date(${payments.createdAt})`))

    // Get recent failed payments
    const recentFailures = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        amount: payments.amount,
        currency: payments.currency,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        paymentMethod: payments.paymentMethod,
        failureMessage: payments.failureMessage,
        createdAt: payments.createdAt,
        orderNumber: orders.orderNumber,
        customerEmail: customers.email
      })
      .from(payments)
      .leftJoin(orders, eq(orders.id, payments.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(payments.status, 'failed'))
      .orderBy(desc(payments.createdAt))
      .limit(10)

    // Get top customers by payment volume
    const topCustomers = await db
      .select({
        customerId: customers.id,
        customerName: customers.name,
        customerEmail: customers.email,
        totalSpent: sql<number>`sum(${payments.amount})`,
        transactionCount: sql<number>`count(*)`
      })
      .from(payments)
      .innerJoin(orders, eq(orders.id, payments.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(eq(payments.status, 'captured'))
      .groupBy(customers.id)
      .orderBy(desc(sql`sum(${payments.amount})`))
      .limit(10)

    return {
      ...stats[0],
      successRate,
      paymentMethods,
      gateways,
      dailyTrend,
      recentFailures,
      topCustomers
    }
  } catch (error) {
    console.error('Error fetching payment stats:', error)
    throw error
  }
}

export async function getRefundablePayments(filters: { orderId?: string } = {}) {
  try {
    const conditions = [eq(payments.status, 'captured')]
    
    if (filters.orderId) {
      conditions.push(eq(payments.orderId, filters.orderId))
    }

    const refundablePayments = await db
      .select({
        id: payments.id,
        orderId: payments.orderId,
        amount: payments.amount,
        currency: payments.currency,
        gateway: payments.gateway,
        gatewayTransactionId: payments.gatewayTransactionId,
        paymentMethod: payments.paymentMethod,
        createdAt: payments.createdAt,
        orderNumber: orders.orderNumber,
        customerEmail: customers.email
      })
      .from(payments)
      .leftJoin(orders, eq(orders.id, payments.orderId))
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(and(...conditions))
      .orderBy(desc(payments.createdAt))

    return refundablePayments
  } catch (error) {
    console.error('Error fetching refundable payments:', error)
    throw error
  }
}

export async function getPaymentAnalytics(dateFrom?: Date, dateTo?: Date) {
  try {
    const conditions = []
    
    if (dateFrom) {
      conditions.push(gte(payments.createdAt, dateFrom))
    }
    
    if (dateTo) {
      conditions.push(lte(payments.createdAt, dateTo))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Revenue by day
    const revenueByDay = await db
      .select({
        date: sql<string>`date(${payments.createdAt})`,
        revenue: sql<number>`coalesce(sum(case when ${payments.status} = 'captured' then ${payments.amount} else 0 end), 0)`,
        transactions: sql<number>`count(case when ${payments.status} = 'captured' then 1 end)`,
        refunds: sql<number>`coalesce(sum(case when ${payments.status} = 'refunded' then abs(${payments.amount}) else 0 end), 0)`
      })
      .from(payments)
      .where(whereClause)
      .groupBy(sql`date(${payments.createdAt})`)
      .orderBy(asc(sql`date(${payments.createdAt})`))

    // Revenue by hour (for today)
    const revenueByHour = await db
      .select({
        hour: sql<number>`extract(hour from ${payments.createdAt})`,
        revenue: sql<number>`coalesce(sum(case when ${payments.status} = 'captured' then ${payments.amount} else 0 end), 0)`,
        transactions: sql<number>`count(case when ${payments.status} = 'captured' then 1 end)`
      })
      .from(payments)
      .where(
        and(
          eq(sql`date(${payments.createdAt})`, sql`current_date`),
          whereClause
        )
      )
      .groupBy(sql`extract(hour from ${payments.createdAt})`)
      .orderBy(asc(sql`extract(hour from ${payments.createdAt})`))

    // Payment status distribution
    const statusDistribution = await db
      .select({
        status: payments.status,
        count: sql<number>`count(*)`,
        volume: sql<number>`coalesce(sum(${payments.amount}), 0)`
      })
      .from(payments)
      .where(whereClause)
      .groupBy(payments.status)
      .orderBy(desc(sql`count(*)`))

    return {
      revenueByDay,
      revenueByHour,
      statusDistribution
    }
  } catch (error) {
    console.error('Error fetching payment analytics:', error)
    throw error
  }
}

export const getCachedPaymentStats = unstable_cache(
  getPaymentStats,
  ['payment-stats'],
  { revalidate: 300 } // Cache for 5 minutes
)