import { db } from '@/db'
import { sql, count, eq, desc } from 'drizzle-orm'
import { products } from '@/db/schema/products'
import { orders, customers, payments } from '@/db/schema'
import { getLowStockItems } from './inventory'

export interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalCustomers: number
  totalRevenue: number
  lowStockProducts: number
  pendingOrders: number
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Run all queries in parallel for better performance
    const [
      productStats,
      orderStats, 
      customerStats,
      revenueStats,
      lowStockItems,
      pendingOrderStats
    ] = await Promise.all([
      // Total products
      db.select({ count: count() }).from(products),
      
      // Total orders
      db.select({ count: count() }).from(orders),
      
      // Total customers  
      db.select({ count: count() }).from(customers),
      
      // Total revenue from completed payments
      db.select({ 
        total: sql<number>`COALESCE(SUM(${payments.amount}), 0)` 
      }).from(payments).where(sql`${payments.status} = 'completed'`),
      
      // Low stock items from inventory
      getLowStockItems(10),
      
      // Pending orders
      db.select({ count: count() }).from(orders)
        .where(sql`${orders.status} = 'pending'`)
    ])

    return {
      totalProducts: productStats[0]?.count ?? 0,
      totalOrders: orderStats[0]?.count ?? 0, 
      totalCustomers: customerStats[0]?.count ?? 0,
      totalRevenue: revenueStats[0]?.total ?? 0,
      lowStockProducts: lowStockItems.length,
      pendingOrders: pendingOrderStats[0]?.count ?? 0
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalCustomers: 0, 
      totalRevenue: 0,
      lowStockProducts: 0,
      pendingOrders: 0
    }
  }
}

/**
 * Get recent orders for dashboard
 */
export async function getRecentOrders(limit: number = 5) {
  try {
    const recentOrders = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalAmount: orders.totalAmount,
      currency: orders.currency,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      email: orders.email,
      createdAt: orders.createdAt,
      // Join customer info if available
      customerId: orders.customerId
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(limit)

    return recentOrders
  } catch (error) {
    console.error('Error fetching recent orders:', error)
    // Return empty array on error instead of crashing
    return []
  }
}

/**
 * Get top selling products for dashboard
 */
export async function getTopProducts(limit: number = 5) {
  try {
    // This would require order_items table to get actual sales data
    // For now, we'll return products ordered by creation date
    return await db.query.products.findMany({
      limit,
      orderBy: (products, { desc }) => [desc(products.createdAt)],
      columns: {
        id: true,
        title: true,
        price: true,
        status: true,
        inventoryQuantity: true
      }
    })
  } catch (error) {
    console.error('Error fetching top products:', error)
    return []
  }
}