import { db } from '@/db'
import { orders, orderItems, customers, products, productVariants, payments } from '@/db/schema'
import { eq, desc, asc, gte, lte, sql, and, between, count, sum, avg, max, min, isNotNull } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

interface AnalyticsFilters {
  dateFrom?: Date
  dateTo?: Date
  period?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
}

// Helper function to get date filters
function getDateFilters(filters: AnalyticsFilters) {
  const { dateFrom, dateTo, period = 'month' } = filters
  const now = new Date()
  let startDate: Date
  let endDate: Date = dateTo || now

  if (dateFrom && dateTo) {
    startDate = dateFrom
    endDate = dateTo
  } else {
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3
        startDate = new Date(now.getFullYear(), quarterStart, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }
  }

  return { startDate, endDate }
}

export async function getSalesAnalytics(filters: AnalyticsFilters = {}) {
  const { startDate, endDate } = getDateFilters(filters)
  
  try {
    // Sales Overview Query
    const overviewQuery = await db
      .select({
        totalSales: sum(orders.totalAmount).mapWith(Number),
        totalOrders: count(orders.id).mapWith(Number),
        totalItems: sum(orderItems.quantity).mapWith(Number),
        uniqueCustomers: sql<number>`COUNT(DISTINCT ${orders.customerId})`.mapWith(Number),
        successfulOrders: sql<number>`COUNT(CASE WHEN ${orders.status} IN ('delivered', 'processing', 'shipped') THEN 1 END)`.mapWith(Number),
        pendingOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END)`.mapWith(Number),
        cancelledOrders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'cancelled' THEN 1 END)`.mapWith(Number),
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        isNotNull(orders.totalAmount)
      ))

    const overview = overviewQuery[0] || {
      totalSales: 0,
      totalOrders: 0,
      totalItems: 0,
      uniqueCustomers: 0,
      successfulOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
    }

    const averageOrderValue = overview.totalOrders > 0 ? overview.totalSales / overview.totalOrders : 0

    // Sales by Period (Daily breakdown)
    const salesByPeriodQuery = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        totalSales: sum(orders.totalAmount).mapWith(Number),
        totalOrders: count(orders.id).mapWith(Number),
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      ))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`)

    // Sales by Hour of Day
    const salesByHourQuery = await db
      .select({
        hour: sql<number>`EXTRACT(hour FROM ${orders.createdAt})`.mapWith(Number),
        totalSales: sum(orders.totalAmount).mapWith(Number),
        totalOrders: count(orders.id).mapWith(Number),
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      ))
      .groupBy(sql`EXTRACT(hour FROM ${orders.createdAt})`)
      .orderBy(sql`EXTRACT(hour FROM ${orders.createdAt})`)

    // Top Products by Revenue
    const topProductsQuery = await db
      .select({
        productId: orderItems.productId,
        productTitle: orderItems.productTitle,
        totalRevenue: sum(orderItems.total).mapWith(Number),
        totalQuantity: sum(orderItems.quantity).mapWith(Number),
        totalOrders: count(sql`DISTINCT ${orderItems.orderId}`).mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate)
      ))
      .groupBy(orderItems.productId, orderItems.productTitle)
      .orderBy(desc(sql`SUM(${orderItems.total})`))
      .limit(10)

    // Sales by Payment Method
    const salesByPaymentMethodQuery = await db
      .select({
        paymentMethod: payments.paymentMethod,
        totalSales: sum(payments.amount).mapWith(Number),
        totalOrders: count(sql`DISTINCT ${payments.orderId}`).mapWith(Number),
      })
      .from(payments)
      .innerJoin(orders, eq(payments.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(payments.status, 'captured'),
        isNotNull(payments.paymentMethod)
      ))
      .groupBy(payments.paymentMethod)
      .orderBy(desc(sql`SUM(${payments.amount})`))

    // Customer Metrics (New vs Returning)
    const customerMetricsQuery = await db
      .select({
        customerId: orders.customerId,
        firstOrder: min(orders.createdAt),
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        isNotNull(orders.customerId)
      ))
      .groupBy(orders.customerId)

    const newCustomers = customerMetricsQuery.filter(c => c.firstOrder >= startDate).length
    const returningCustomers = customerMetricsQuery.length - newCustomers

    return {
      overview: {
        totalSales: overview.totalSales || 0,
        totalOrders: overview.totalOrders || 0,
        averageOrderValue: Math.round(averageOrderValue) || 0,
        totalCustomers: overview.uniqueCustomers || 0,
        totalItems: overview.totalItems || 0,
        successfulOrders: overview.successfulOrders || 0,
        pendingOrders: overview.pendingOrders || 0,
        cancelledOrders: overview.cancelledOrders || 0
      },
      salesByPeriod: salesByPeriodQuery.map(row => ({
        date: row.date,
        totalSales: row.totalSales || 0,
        totalOrders: row.totalOrders || 0
      })),
      salesByHour: Array.from({ length: 24 }, (_, hour) => {
        const hourData = salesByHourQuery.find(row => row.hour === hour)
        return {
          hour,
          totalSales: hourData?.totalSales || 0,
          totalOrders: hourData?.totalOrders || 0
        }
      }),
      topProducts: topProductsQuery.map(row => ({
        productId: row.productId,
        productTitle: row.productTitle,
        totalRevenue: row.totalRevenue || 0,
        totalQuantity: row.totalQuantity || 0,
        totalOrders: row.totalOrders || 0
      })),
      salesByPaymentMethod: salesByPaymentMethodQuery.map(row => ({
        paymentMethod: row.paymentMethod || 'Unknown',
        totalSales: row.totalSales || 0,
        totalOrders: row.totalOrders || 0
      })),
      customerMetrics: { 
        newCustomers: newCustomers || 0, 
        returningCustomers: returningCustomers || 0 
      }
    }
  } catch (error) {
    console.error('Error fetching sales analytics:', error)
    return {
      overview: {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalCustomers: 0,
        totalItems: 0,
        successfulOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0
      },
      salesByPeriod: [],
      salesByHour: [],
      topProducts: [],
      salesByPaymentMethod: [],
      customerMetrics: { newCustomers: 0, returningCustomers: 0 }
    }
  }
}

export async function getRevenueAnalytics(filters: AnalyticsFilters = {}) {
  const { startDate, endDate } = getDateFilters(filters)
  
  try {
    // Revenue Breakdown Query
    const revenueBreakdownQuery = await db
      .select({
        totalRevenue: sum(orders.totalAmount).mapWith(Number),
        productRevenue: sum(orders.subtotalAmount).mapWith(Number),
        shippingRevenue: sum(orders.shippingAmount).mapWith(Number),
        taxRevenue: sum(orders.taxAmount).mapWith(Number),
        discountAmount: sum(orders.discountAmount).mapWith(Number),
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        sql`${orders.status} NOT IN ('cancelled', 'refunded')`
      ))

    // Get refunded amounts
    const { refunds } = await import('@/db/schema')
    const refundQuery = await db
      .select({
        refundedAmount: sum(refunds.amount).mapWith(Number),
      })
      .from(refunds)
      .innerJoin(orders, eq(refunds.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        eq(refunds.status, 'success')
      ))

    const breakdown = revenueBreakdownQuery[0] || {
      totalRevenue: 0,
      productRevenue: 0,
      shippingRevenue: 0,
      taxRevenue: 0,
      discountAmount: 0,
    }

    const refundedAmount = refundQuery[0]?.refundedAmount || 0
    const netRevenue = (breakdown.totalRevenue || 0) - refundedAmount

    // Revenue by Month (Last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const revenueByMonthQuery = await db
      .select({
        year: sql<number>`EXTRACT(year FROM ${orders.createdAt})`.mapWith(Number),
        month: sql<number>`EXTRACT(month FROM ${orders.createdAt})`.mapWith(Number),
        totalRevenue: sum(orders.totalAmount).mapWith(Number),
        totalOrders: count(orders.id).mapWith(Number),
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, twelveMonthsAgo),
        sql`${orders.status} NOT IN ('cancelled', 'refunded')`
      ))
      .groupBy(sql`EXTRACT(year FROM ${orders.createdAt})`, sql`EXTRACT(month FROM ${orders.createdAt})`)
      .orderBy(sql`EXTRACT(year FROM ${orders.createdAt})`, sql`EXTRACT(month FROM ${orders.createdAt})`)

    // Calculate growth rate (current month vs previous month)
    const currentMonth = revenueByMonthQuery[revenueByMonthQuery.length - 1]
    const previousMonth = revenueByMonthQuery[revenueByMonthQuery.length - 2]
    
    let growthRate = 0
    if (currentMonth && previousMonth && previousMonth.totalRevenue > 0) {
      growthRate = ((currentMonth.totalRevenue - previousMonth.totalRevenue) / previousMonth.totalRevenue) * 100
    }

    return {
      breakdown: {
        totalRevenue: breakdown.totalRevenue || 0,
        productRevenue: breakdown.productRevenue || 0,
        shippingRevenue: breakdown.shippingRevenue || 0,
        taxRevenue: breakdown.taxRevenue || 0,
        discountAmount: breakdown.discountAmount || 0,
        refundedAmount: refundedAmount || 0,
        netRevenue: netRevenue || 0
      },
      revenueByMonth: revenueByMonthQuery.map(row => ({
        year: row.year,
        month: row.month,
        totalRevenue: row.totalRevenue || 0,
        totalOrders: row.totalOrders || 0,
        monthLabel: new Date(row.year, row.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      })),
      growthRate: Math.round(growthRate * 100) / 100 || 0
    }
  } catch (error) {
    console.error('Error fetching revenue analytics:', error)
    return {
      breakdown: {
        totalRevenue: 0,
        productRevenue: 0,
        shippingRevenue: 0,
        taxRevenue: 0,
        discountAmount: 0,
        refundedAmount: 0,
        netRevenue: 0
      },
      revenueByMonth: [],
      growthRate: 0
    }
  }
}

export async function getProductPerformance(filters: AnalyticsFilters = {}) {
  const { startDate, endDate } = getDateFilters(filters)
  
  try {
    // Product Metrics Query
    const productMetricsQuery = await db
      .select({
        productId: orderItems.productId,
        productTitle: orderItems.productTitle,
        totalRevenue: sum(orderItems.total).mapWith(Number),
        totalQuantity: sum(orderItems.quantity).mapWith(Number),
        totalOrders: count(sql`DISTINCT ${orderItems.orderId}`).mapWith(Number),
        averageOrderValue: sql<number>`AVG(${orderItems.total})`.mapWith(Number),
        conversionRate: sql<number>`COUNT(DISTINCT ${orderItems.orderId}) * 100.0 / COUNT(*)`.mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        sql`${orders.status} NOT IN ('cancelled', 'refunded')`
      ))
      .groupBy(orderItems.productId, orderItems.productTitle)
      .orderBy(desc(sql`SUM(${orderItems.total})`))
      .limit(50)

    // Category Performance Query (using productType as category)
    const categoryPerformanceQuery = await db
      .select({
        category: products.productType,
        totalRevenue: sum(orderItems.total).mapWith(Number),
        totalQuantity: sum(orderItems.quantity).mapWith(Number),
        totalOrders: count(sql`DISTINCT ${orderItems.orderId}`).mapWith(Number),
        averageOrderValue: sql<number>`AVG(${orderItems.total})`.mapWith(Number),
        uniqueProducts: count(sql`DISTINCT ${orderItems.productId}`).mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        sql`${orders.status} NOT IN ('cancelled', 'refunded')`,
        isNotNull(products.productType)
      ))
      .groupBy(products.productType)
      .orderBy(desc(sql`SUM(${orderItems.total})`))

    // Low Performing Products (products with low sales in the period)
    const lowPerformingProductsQuery = await db
      .select({
        productId: products.id,
        productTitle: products.title,
        productType: products.productType,
        totalRevenue: sql<number>`COALESCE(SUM(${orderItems.total}), 0)`.mapWith(Number),
        totalQuantity: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`.mapWith(Number),
        totalOrders: count(sql`DISTINCT ${orderItems.orderId}`).mapWith(Number),
        inventoryCount: sql<number>`SUM(${productVariants.inventoryQuantity})`.mapWith(Number),
        lastOrderDate: max(orders.createdAt),
      })
      .from(products)
      .leftJoin(productVariants, eq(products.id, productVariants.productId))
      .leftJoin(orderItems, eq(products.id, orderItems.productId))
      .leftJoin(orders, and(
        eq(orderItems.orderId, orders.id),
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        sql`${orders.status} NOT IN ('cancelled', 'refunded')`
      ))
      .where(eq(products.status, 'active'))
      .groupBy(products.id, products.title, products.productType)
      .having(sql`COALESCE(SUM(${orderItems.total}), 0) < 1000`) // Products with less than ₹10 in sales
      .orderBy(sql`COALESCE(SUM(${orderItems.total}), 0)`)
      .limit(20)

    return {
      productMetrics: productMetricsQuery.map(row => ({
        productId: row.productId,
        productTitle: row.productTitle,
        totalRevenue: row.totalRevenue || 0,
        totalQuantity: row.totalQuantity || 0,
        totalOrders: row.totalOrders || 0,
        averageOrderValue: Math.round(row.averageOrderValue) || 0,
        conversionRate: Math.round((row.conversionRate || 0) * 100) / 100,
      })),
      categoryPerformance: categoryPerformanceQuery.map(row => ({
        category: row.category || 'Uncategorized',
        totalRevenue: row.totalRevenue || 0,
        totalQuantity: row.totalQuantity || 0,
        totalOrders: row.totalOrders || 0,
        averageOrderValue: Math.round(row.averageOrderValue) || 0,
        uniqueProducts: row.uniqueProducts || 0,
      })),
      lowPerformingProducts: lowPerformingProductsQuery.map(row => ({
        productId: row.productId,
        productTitle: row.productTitle,
        productType: row.productType || 'Uncategorized',
        totalRevenue: row.totalRevenue || 0,
        totalQuantity: row.totalQuantity || 0,
        totalOrders: row.totalOrders || 0,
        inventoryCount: row.inventoryCount || 0,
        lastOrderDate: row.lastOrderDate,
        daysSinceLastOrder: row.lastOrderDate 
          ? Math.floor((Date.now() - row.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
          : null
      }))
    }
  } catch (error) {
    console.error('Error fetching product performance:', error)
    return {
      productMetrics: [],
      categoryPerformance: [],
      lowPerformingProducts: []
    }
  }
}

export async function getCustomerAnalytics(filters: AnalyticsFilters = {}) {
  const { startDate, endDate } = getDateFilters(filters)
  
  try {
    // Customer Metrics Query
    const customerMetricsQuery = await db
      .select({
        totalCustomers: count(customers.id).mapWith(Number),
        totalActiveCustomers: sql<number>`COUNT(CASE WHEN ${customers.status} = 'active' THEN 1 END)`.mapWith(Number),
        averageLifetimeValue: avg(customers.totalSpent).mapWith(Number),
      })
      .from(customers)

    // New customers this month
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const newCustomersQuery = await db
      .select({
        newCustomers: count(customers.id).mapWith(Number),
      })
      .from(customers)
      .where(gte(customers.createdAt, thisMonthStart))

    // Active customers (customers who made an order in the selected period)
    const activeCustomersQuery = await db
      .select({
        activeCustomers: count(sql`DISTINCT ${orders.customerId}`).mapWith(Number),
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        isNotNull(orders.customerId)
      ))

    // Average orders per customer
    const ordersPerCustomerQuery = await db
      .select({
        totalOrders: count(orders.id).mapWith(Number),
        uniqueCustomers: count(sql`DISTINCT ${orders.customerId}`).mapWith(Number),
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        isNotNull(orders.customerId)
      ))

    // Acquisition channels (based on order source)
    const acquisitionChannelsQuery = await db
      .select({
        source: orders.source,
        totalCustomers: count(sql`DISTINCT ${orders.customerId}`).mapWith(Number),
        totalOrders: count(orders.id).mapWith(Number),
        totalRevenue: sum(orders.totalAmount).mapWith(Number),
      })
      .from(orders)
      .where(and(
        gte(orders.createdAt, startDate),
        lte(orders.createdAt, endDate),
        isNotNull(orders.customerId)
      ))
      .groupBy(orders.source)
      .orderBy(desc(sql`COUNT(DISTINCT ${orders.customerId})`))

    // Customer retention cohorts (simplified version)
    const cohortQuery = await db
      .select({
        cohortMonth: sql<string>`TO_CHAR(${customers.createdAt}, 'YYYY-MM')`,
        customersCount: count(customers.id).mapWith(Number),
        totalSpent: sum(customers.totalSpent).mapWith(Number),
        totalOrders: sum(customers.totalOrders).mapWith(Number),
      })
      .from(customers)
      .where(gte(customers.createdAt, new Date(new Date().setMonth(new Date().getMonth() - 12))))
      .groupBy(sql`TO_CHAR(${customers.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${customers.createdAt}, 'YYYY-MM')`)

    // Top customers by lifetime value
    const topCustomersQuery = await db
      .select({
        customerId: customers.id,
        customerName: customers.name,
        customerEmail: customers.email,
        totalSpent: customers.totalSpent,
        totalOrders: customers.totalOrders,
        lastOrderDate: customers.lastOrderDate,
        createdAt: customers.createdAt,
      })
      .from(customers)
      .where(eq(customers.status, 'active'))
      .orderBy(desc(customers.totalSpent))
      .limit(10)

    const metrics = customerMetricsQuery[0] || {
      totalCustomers: 0,
      totalActiveCustomers: 0,
      averageLifetimeValue: 0,
    }

    const newCustomers = newCustomersQuery[0]?.newCustomers || 0
    const activeCustomers = activeCustomersQuery[0]?.activeCustomers || 0
    const ordersData = ordersPerCustomerQuery[0] || { totalOrders: 0, uniqueCustomers: 0 }
    
    const averageOrdersPerCustomer = ordersData.uniqueCustomers > 0 
      ? Math.round((ordersData.totalOrders / ordersData.uniqueCustomers) * 100) / 100 
      : 0

    return {
      metrics: {
        totalCustomers: metrics.totalCustomers || 0,
        activeCustomers: activeCustomers || 0,
        newCustomersThisMonth: newCustomers || 0,
        averageOrdersPerCustomer: averageOrdersPerCustomer || 0,
        averageCustomerLifetimeValue: Math.round(metrics.averageLifetimeValue || 0)
      },
      acquisitionChannels: acquisitionChannelsQuery.map(row => ({
        source: row.source || 'Unknown',
        totalCustomers: row.totalCustomers || 0,
        totalOrders: row.totalOrders || 0,
        totalRevenue: row.totalRevenue || 0,
        averageOrderValue: row.totalOrders > 0 ? Math.round((row.totalRevenue || 0) / row.totalOrders) : 0
      })),
      retentionCohorts: cohortQuery.map(row => ({
        cohortMonth: row.cohortMonth,
        customersCount: row.customersCount || 0,
        totalSpent: row.totalSpent || 0,
        totalOrders: row.totalOrders || 0,
        averageSpentPerCustomer: row.customersCount > 0 ? Math.round((row.totalSpent || 0) / row.customersCount) : 0
      })),
      topCustomers: topCustomersQuery.map(row => ({
        customerId: row.customerId,
        customerName: row.customerName || 'Anonymous',
        customerEmail: row.customerEmail,
        totalSpent: row.totalSpent || 0,
        totalOrders: row.totalOrders || 0,
        lastOrderDate: row.lastOrderDate,
        customerSince: row.createdAt,
        daysSinceLastOrder: row.lastOrderDate 
          ? Math.floor((Date.now() - row.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
          : null
      }))
    }
  } catch (error) {
    console.error('Error fetching customer analytics:', error)
    return {
      metrics: {
        totalCustomers: 0,
        activeCustomers: 0,
        newCustomersThisMonth: 0,
        averageOrdersPerCustomer: 0,
        averageCustomerLifetimeValue: 0
      },
      acquisitionChannels: [],
      retentionCohorts: [],
      topCustomers: []
    }
  }
}

// Cached versions for better performance
export const getCachedSalesAnalytics = unstable_cache(
  getSalesAnalytics,
  ['sales-analytics'],
  { revalidate: 300 } // 5 minutes
)

export const getCachedRevenueAnalytics = unstable_cache(
  getRevenueAnalytics,
  ['revenue-analytics'],
  { revalidate: 300 }
)

export const getCachedProductPerformance = unstable_cache(
  getProductPerformance,
  ['product-performance'],
  { revalidate: 600 } // 10 minutes
)

export const getCachedCustomerAnalytics = unstable_cache(
  getCustomerAnalytics,
  ['customer-analytics'],
  { revalidate: 600 }
)