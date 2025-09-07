import { db } from '@/db'
import { orders, orderItems, payments, orderStatusHistory } from '@/db/schema/orders'
import { customers } from '@/db/schema/customers'
import { products, productVariants } from '@/db/schema/products'
import { eq, desc, asc, and, or, like, gte, lte, inArray, sql, count, isNull } from 'drizzle-orm'

export interface OrderFilters {
  search?: string
  status?: string
  paymentStatus?: string
  fulfillmentStatus?: string
  dateFrom?: Date
  dateTo?: Date
  customerId?: string
  minAmount?: number
  maxAmount?: number
  page?: number
  limit?: number
  sortBy?: 'createdAt' | 'totalAmount' | 'orderNumber'
  sortOrder?: 'asc' | 'desc'
}

export async function getOrders(filters: OrderFilters = {}) {
  try {
    const { 
      search,
      status,
      paymentStatus,
      fulfillmentStatus,
      dateFrom,
      dateTo,
      customerId,
      minAmount,
      maxAmount,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters

    // Build where conditions
    const conditions = []

    if (search) {
      conditions.push(
        or(
          like(orders.orderNumber, `%${search}%`),
          like(orders.email, `%${search}%`),
          like(customers.name, `%${search}%`)
        )
      )
    }

    if (status) {
      conditions.push(eq(orders.status, status))
    }

    if (paymentStatus) {
      conditions.push(eq(orders.paymentStatus, paymentStatus))
    }

    if (fulfillmentStatus) {
      conditions.push(eq(orders.fulfillmentStatus, fulfillmentStatus))
    }

    if (dateFrom) {
      conditions.push(gte(orders.createdAt, dateFrom))
    }

    if (dateTo) {
      conditions.push(lte(orders.createdAt, dateTo))
    }

    if (customerId) {
      conditions.push(eq(orders.customerId, customerId))
    }

    if (minAmount !== undefined) {
      conditions.push(gte(orders.totalAmount, minAmount))
    }

    if (maxAmount !== undefined) {
      conditions.push(lte(orders.totalAmount, maxAmount))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count for pagination
    const [{ total }] = await db
      .select({ total: count() })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause)

    // Build order by clause
    let orderByClause
    if (sortBy === 'totalAmount') {
      orderByClause = sortOrder === 'asc' ? asc(orders.totalAmount) : desc(orders.totalAmount)
    } else if (sortBy === 'orderNumber') {
      orderByClause = sortOrder === 'asc' ? asc(orders.orderNumber) : desc(orders.orderNumber)
    } else {
      orderByClause = sortOrder === 'asc' ? asc(orders.createdAt) : desc(orders.createdAt)
    }

    // Get orders with customer data
    const orderResults = await db
      .select({
        order: orders,
        customer: customers
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset((page - 1) * limit)

    const totalPages = Math.ceil(total / limit)

    return {
      orders: orderResults.map(({ order, customer }) => ({
        ...order,
        customer: customer || {
          id: null,
          name: null,
          email: order.email,
          phone: order.phone || null,
          totalSpent: 0,
          totalOrders: 0
        }
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return {
      orders: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      }
    }
  }
}

export async function getOrderById(orderId: string) {
  try {
    // Get order with customer data
    const orderResult = await db
      .select({
        order: orders,
        customer: customers
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, orderId))
      .limit(1)

    if (!orderResult || orderResult.length === 0) {
      return null
    }

    const { order, customer } = orderResult[0]

    // Get order items with product data
    const orderItemsResult = await db
      .select({
        orderItem: orderItems,
        product: products,
        variant: productVariants
      })
      .from(orderItems)
      .leftJoin(productVariants, eq(orderItems.variantId, productVariants.id))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.createdAt))

    // Get payments
    const paymentsResult = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .orderBy(desc(payments.createdAt))

    // Get status history
    const statusHistoryResult = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, orderId))
      .orderBy(desc(orderStatusHistory.createdAt))

    return {
      ...order,
      customer: customer || {
        id: null,
        name: null,
        email: order.email,
        phone: order.phone || null,
        totalSpent: 0,
        totalOrders: 0
      },
      items: orderItemsResult.map(({ orderItem, product, variant }) => ({
        ...orderItem,
        product: product || {
          id: orderItem.productId,
          title: orderItem.productTitle,
          handle: orderItem.productHandle
        },
        variant: variant || {
          id: orderItem.variantId,
          title: orderItem.variantTitle,
          sku: orderItem.sku,
          barcode: orderItem.barcode
        }
      })),
      payments: paymentsResult || [],
      statusHistory: statusHistoryResult || []
    }
  } catch (error) {
    console.error('Error fetching order:', error)
    return null
  }
}

export async function getOrderByNumber(orderNumber: string) {
  try {
    // Get order ID by order number first
    const orderResult = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1)

    if (!orderResult || orderResult.length === 0) {
      return null
    }

    // Use getOrderById to get full order data
    return await getOrderById(orderResult[0].id)
  } catch (error) {
    console.error('Error fetching order by number:', error)
    return null
  }
}

export async function getOrderStats() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get all stats in parallel
    const [
      totalOrdersResult,
      todayOrdersResult,
      monthOrdersResult,
      pendingOrdersResult,
      processingOrdersResult,
      completedOrdersResult,
      totalRevenueResult,
      todayRevenueResult,
      monthRevenueResult
    ] = await Promise.all([
      // Total orders
      db.select({ count: count() }).from(orders),
      
      // Today orders
      db.select({ count: count() }).from(orders)
        .where(gte(orders.createdAt, todayStart)),
      
      // Month orders
      db.select({ count: count() }).from(orders)
        .where(gte(orders.createdAt, monthStart)),
      
      // Pending orders
      db.select({ count: count() }).from(orders)
        .where(eq(orders.status, 'pending')),
      
      // Processing orders
      db.select({ count: count() }).from(orders)
        .where(eq(orders.status, 'processing')),
      
      // Completed orders (delivered)
      db.select({ count: count() }).from(orders)
        .where(eq(orders.status, 'delivered')),
      
      // Total revenue
      db.select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)` }).from(orders)
        .where(eq(orders.paymentStatus, 'paid')),
      
      // Today revenue
      db.select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)` }).from(orders)
        .where(and(
          eq(orders.paymentStatus, 'paid'),
          gte(orders.createdAt, todayStart)
        )),
      
      // Month revenue
      db.select({ total: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)` }).from(orders)
        .where(and(
          eq(orders.paymentStatus, 'paid'),
          gte(orders.createdAt, monthStart)
        ))
    ])

    return {
      totalOrders: totalOrdersResult[0]?.count || 0,
      todayOrders: todayOrdersResult[0]?.count || 0,
      monthOrders: monthOrdersResult[0]?.count || 0,
      pendingOrders: pendingOrdersResult[0]?.count || 0,
      processingOrders: processingOrdersResult[0]?.count || 0,
      completedOrders: completedOrdersResult[0]?.count || 0,
      revenue: {
        total: totalRevenueResult[0]?.total || 0,
        today: todayRevenueResult[0]?.total || 0,
        month: monthRevenueResult[0]?.total || 0
      }
    }
  } catch (error) {
    console.error('Error fetching order stats:', error)
    return {
      totalOrders: 0,
      todayOrders: 0,
      monthOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      completedOrders: 0,
      revenue: {
        total: 0,
        today: 0,
        month: 0
      }
    }
  }
}

export async function getRecentOrders(limit: number = 10) {
  try {
    const orderResults = await db
      .select({
        order: orders,
        customer: customers
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .orderBy(desc(orders.createdAt))
      .limit(limit)

    return orderResults.map(({ order, customer }) => ({
      ...order,
      customer: customer || {
        id: null,
        name: null,
        email: order.email,
        phone: order.phone || null,
        totalSpent: 0,
        totalOrders: 0
      }
    }))
  } catch (error) {
    console.error('Error fetching recent orders:', error)
    return []
  }
}

export async function searchOrders(query: string, limit: number = 10) {
  try {
    const searchTerm = `%${query.toLowerCase()}%`
    
    const orderResults = await db
      .select({
        order: orders,
        customer: customers
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(
        or(
          like(sql`LOWER(${orders.orderNumber})`, searchTerm),
          like(sql`LOWER(${orders.email})`, searchTerm),
          like(sql`LOWER(${customers.name})`, searchTerm),
          like(sql`LOWER(${orders.phone})`, searchTerm)
        )
      )
      .orderBy(desc(orders.createdAt))
      .limit(limit)

    return orderResults.map(({ order, customer }) => ({
      ...order,
      customer: customer || {
        id: null,
        name: null,
        email: order.email,
        phone: order.phone || null,
        totalSpent: 0,
        totalOrders: 0
      }
    }))
  } catch (error) {
    console.error('Error searching orders:', error)
    return []
  }
}