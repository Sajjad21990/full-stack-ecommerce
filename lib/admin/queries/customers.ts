import { db } from '@/db'
import { customers, users, orders, orderItems, addresses, customerGroups, customerGroupMembers, products, productVariants } from '@/db/schema'
import { eq, desc, asc, like, or, and, gte, lte, sql, count, sum, isNotNull, isNull } from 'drizzle-orm'
import { unstable_cache } from 'next/cache'

interface CustomerFilters {
  page?: number
  limit?: number
  search?: string
  status?: 'active' | 'inactive' | 'blocked'
  emailVerified?: boolean
  dateFrom?: Date
  dateTo?: Date
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'email' | 'totalSpent' | 'orderCount'
  sortOrder?: 'asc' | 'desc'
  groupId?: string
  hasOrders?: boolean
}

export async function getCustomers(filters: CustomerFilters = {}) {
  const {
    page = 1,
    limit = 10,
    search,
    status,
    emailVerified,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    groupId,
    hasOrders
  } = filters

  try {
    // Build WHERE conditions
    const conditions = []

    if (search) {
      conditions.push(
        or(
          like(customers.name, `%${search}%`),
          like(customers.email, `%${search}%`),
          like(customers.phone, `%${search}%`)
        )
      )
    }

    if (status) {
      conditions.push(eq(customers.status, status))
    }

    if (emailVerified !== undefined) {
      if (emailVerified) {
        conditions.push(isNotNull(customers.emailVerified))
      } else {
        conditions.push(isNull(customers.emailVerified))
      }
    }

    if (dateFrom) {
      conditions.push(gte(customers.createdAt, dateFrom))
    }

    if (dateTo) {
      conditions.push(lte(customers.createdAt, dateTo))
    }

    if (hasOrders !== undefined) {
      if (hasOrders) {
        conditions.push(gte(customers.totalOrders, 1))
      } else {
        conditions.push(eq(customers.totalOrders, 0))
      }
    }

    // Handle group filtering
    let baseQuery = db.select({
      id: customers.id,
      name: customers.name,
      email: customers.email,
      phone: customers.phone,
      status: customers.status,
      emailVerified: customers.emailVerified,
      totalSpent: customers.totalSpent,
      totalOrders: customers.totalOrders,
      lastOrderDate: customers.lastOrderDate,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    }).from(customers)

    if (groupId) {
      baseQuery = baseQuery
        .innerJoin(customerGroupMembers, eq(customers.id, customerGroupMembers.customerId))
        .where(and(eq(customerGroupMembers.groupId, groupId), ...conditions))
    } else {
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions))
      }
    }

    // Add sorting
    const orderColumn = sortBy === 'totalSpent' ? customers.totalSpent :
                       sortBy === 'orderCount' ? customers.totalOrders :
                       sortBy === 'name' ? customers.name :
                       sortBy === 'email' ? customers.email :
                       sortBy === 'updatedAt' ? customers.updatedAt :
                       customers.createdAt

    const orderDirection = sortOrder === 'asc' ? asc : desc
    baseQuery = baseQuery.orderBy(orderDirection(orderColumn))

    // Get total count for pagination
    let countQuery = db.select({ count: count() }).from(customers)
    if (groupId) {
      countQuery = countQuery
        .innerJoin(customerGroupMembers, eq(customers.id, customerGroupMembers.customerId))
        .where(and(eq(customerGroupMembers.groupId, groupId), ...conditions))
    } else {
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions))
      }
    }

    const [totalResult, customersResult] = await Promise.all([
      countQuery,
      baseQuery.limit(limit).offset((page - 1) * limit)
    ])

    const total = totalResult[0]?.count || 0
    const totalPages = Math.ceil(total / limit)

    return {
      customers: customersResult.map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        status: customer.status,
        emailVerified: !!customer.emailVerified,
        image: null, // Add from users table if needed
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        orderCount: customer.totalOrders,
        totalSpent: customer.totalSpent
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    }
  } catch (error) {
    console.error('Error fetching customers:', error)
    return {
      customers: [],
      pagination: {
        total: 0,
        page,
        limit,
        totalPages: 0
      }
    }
  }
}

export async function getCustomerById(customerId: string) {
  try {
    // Get main customer data
    const customerResult = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1)

    if (!customerResult.length) {
      return null
    }

    const customer = customerResult[0]

    // Get customer addresses
    const customerAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.customerId, customerId))
      .orderBy(desc(addresses.isDefault), desc(addresses.createdAt))

    // Get customer orders with basic info
    const customerOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        totalAmount: orders.totalAmount,
        currency: orders.currency,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt))
      .limit(10) // Limit to recent orders for performance

    // Get customer group memberships
    const customerGroupsResult = await db
      .select({
        id: customerGroups.id,
        name: customerGroups.name,
        description: customerGroups.description,
        color: customerGroups.color,
        addedAt: customerGroupMembers.addedAt,
        isAutoAssigned: customerGroupMembers.isAutoAssigned
      })
      .from(customerGroupMembers)
      .innerJoin(customerGroups, eq(customerGroupMembers.groupId, customerGroups.id))
      .where(eq(customerGroupMembers.customerId, customerId))

    // Get favorite products (most ordered products)
    const favoriteProductsResult = await db
      .select({
        productId: orderItems.productId,
        productTitle: orderItems.productTitle,
        productImage: orderItems.productImage,
        orderCount: count(orderItems.orderId),
        totalQuantity: sum(orderItems.quantity),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(eq(orders.customerId, customerId))
      .groupBy(orderItems.productId, orderItems.productTitle, orderItems.productImage)
      .orderBy(desc(count(orderItems.orderId)))
      .limit(5)

    // Calculate stats
    const averageOrderValue = customer.totalOrders > 0 
      ? Math.round(customer.totalSpent / customer.totalOrders) 
      : 0

    return {
      id: customer.id,
      userId: customer.userId,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      dateOfBirth: customer.dateOfBirth,
      acceptsMarketing: customer.acceptsMarketing,
      notes: customer.notes,
      tags: customer.tags || [],
      status: customer.status,
      emailVerified: customer.emailVerified,
      totalSpent: customer.totalSpent,
      totalOrders: customer.totalOrders,
      lastOrderDate: customer.lastOrderDate,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      addresses: customerAddresses,
      orders: customerOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt,
        items: [], // Could be populated separately if needed
        payments: [] // Could be populated separately if needed
      })),
      stats: {
        orderCount: customer.totalOrders,
        totalSpent: customer.totalSpent,
        averageOrderValue,
        lastOrderDate: customer.lastOrderDate
      },
      groups: customerGroupsResult,
      favoriteProducts: favoriteProductsResult.map(product => ({
        productId: product.productId,
        productName: product.productTitle,
        productImage: product.productImage,
        orderCount: Number(product.orderCount) || 0,
        totalQuantity: Number(product.totalQuantity) || 0
      }))
    }
  } catch (error) {
    console.error('Error fetching customer:', error)
    return null
  }
}

export async function getCustomerStats() {
  try {
    const today = new Date()
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Get basic customer stats
    const [
      totalCustomersResult,
      activeCustomersResult,
      verifiedCustomersResult,
      customersWithOrdersResult,
      newCustomersTodayResult,
      newCustomersMonthResult,
      avgLifetimeValueResult
    ] = await Promise.all([
      // Total customers
      db.select({ count: count() }).from(customers),
      
      // Active customers
      db.select({ count: count() }).from(customers).where(eq(customers.status, 'active')),
      
      // Verified customers
      db.select({ count: count() }).from(customers).where(isNotNull(customers.emailVerified)),
      
      // Customers with orders
      db.select({ count: count() }).from(customers).where(gte(customers.totalOrders, 1)),
      
      // New customers today
      db.select({ count: count() }).from(customers).where(gte(customers.createdAt, startOfToday)),
      
      // New customers this month
      db.select({ count: count() }).from(customers).where(gte(customers.createdAt, startOfMonth)),
      
      // Average lifetime value
      db.select({ avg: sql<string>`avg(${customers.totalSpent})` }).from(customers).where(gte(customers.totalOrders, 1))
    ])

    // Get top customers by total spent
    const topCustomersResult = await db
      .select({
        id: customers.id,
        name: customers.name,
        email: customers.email,
        totalSpent: customers.totalSpent,
        totalOrders: customers.totalOrders
      })
      .from(customers)
      .where(gte(customers.totalOrders, 1))
      .orderBy(desc(customers.totalSpent))
      .limit(10)

    // Get acquisition trend for last 7 days
    const acquisitionTrendResult = await db
      .select({
        date: sql<string>`date(${customers.createdAt})`,
        count: count()
      })
      .from(customers)
      .where(gte(customers.createdAt, last7Days))
      .groupBy(sql`date(${customers.createdAt})`)
      .orderBy(sql`date(${customers.createdAt})`)

    // Parse results with safe fallbacks
    const totalCustomers = totalCustomersResult[0]?.count || 0
    const activeCustomers = activeCustomersResult[0]?.count || 0
    const verifiedCustomers = verifiedCustomersResult[0]?.count || 0
    const customersWithOrders = customersWithOrdersResult[0]?.count || 0
    const newCustomersToday = newCustomersTodayResult[0]?.count || 0
    const newCustomersMonth = newCustomersMonthResult[0]?.count || 0
    const avgLifetimeValue = avgLifetimeValueResult[0]?.avg 
      ? Math.round(parseFloat(avgLifetimeValueResult[0].avg))
      : 0

    return {
      totalCustomers,
      activeCustomers,
      verifiedCustomers,
      customersWithOrders,
      newCustomersToday,
      newCustomersMonth,
      avgLifetimeValue,
      topCustomers: topCustomersResult.map(customer => ({
        id: customer.id,
        name: customer.name || 'Unknown',
        email: customer.email,
        orderCount: customer.totalOrders,
        totalSpent: customer.totalSpent
      })),
      acquisitionTrend: acquisitionTrendResult.map(item => ({
        date: item.date,
        count: Number(item.count) || 0
      }))
    }
  } catch (error) {
    console.error('Error fetching customer stats:', error)
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      verifiedCustomers: 0,
      customersWithOrders: 0,
      newCustomersToday: 0,
      newCustomersMonth: 0,
      avgLifetimeValue: 0,
      topCustomers: [],
      acquisitionTrend: []
    }
  }
}

export async function getCustomerGroups() {
  try {
    // Get customer groups with member counts
    const groupsResult = await db
      .select({
        id: customerGroups.id,
        name: customerGroups.name,
        description: customerGroups.description,
        color: customerGroups.color,
        isActive: customerGroups.isActive,
        rules: customerGroups.rules,
        createdAt: customerGroups.createdAt,
        updatedAt: customerGroups.updatedAt,
        memberCount: count(customerGroupMembers.customerId)
      })
      .from(customerGroups)
      .leftJoin(customerGroupMembers, eq(customerGroups.id, customerGroupMembers.groupId))
      .groupBy(
        customerGroups.id,
        customerGroups.name,
        customerGroups.description,
        customerGroups.color,
        customerGroups.isActive,
        customerGroups.rules,
        customerGroups.createdAt,
        customerGroups.updatedAt
      )
      .orderBy(desc(customerGroups.createdAt))

    return groupsResult.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      isActive: group.isActive,
      rules: group.rules,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      memberCount: Number(group.memberCount) || 0
    }))
  } catch (error) {
    console.error('Error fetching customer groups:', error)
    return []
  }
}

export const getCachedCustomerStats = unstable_cache(
  getCustomerStats,
  ['customer-stats'],
  { revalidate: 300 } // Cache for 5 minutes
)