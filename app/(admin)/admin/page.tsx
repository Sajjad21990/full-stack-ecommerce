import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { getDashboardStats, getRecentOrders, getTopProducts } from '@/lib/admin/queries/dashboard'
import { DashboardSkeleton } from '@/components/admin/dashboard/dashboard-skeleton'
import { formatPrice } from '@/lib/utils'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your store.
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  )
}

async function DashboardContent() {
  const [stats, recentOrders, topProducts] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(5),
    getTopProducts(5)
  ])

  const cards = [
    {
      title: 'Total Products',
      value: stats.totalProducts.toString(),
      description: `${stats.lowStockProducts} low in stock`,
      icon: Package,
      alert: stats.lowStockProducts > 0
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toString(), 
      description: `${stats.pendingOrders} pending`,
      icon: ShoppingCart,
      alert: stats.pendingOrders > 0
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers.toString(),
      description: 'Registered customers', 
      icon: Users,
    },
    {
      title: 'Revenue',
      value: formatPrice(stats.totalRevenue),
      description: 'Total completed orders',
      icon: TrendingUp,
    },
  ]

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className="flex items-center gap-2">
                {card.alert && (
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                )}
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className={`text-xs ${card.alert ? 'text-orange-600' : 'text-muted-foreground'}`}>
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Latest orders from your store
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Order #{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.customer ? 
                          `${order.customer.firstName} ${order.customer.lastName}` : 
                          'Guest Order'
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(order.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products Overview</CardTitle>
            <CardDescription>
              Your product catalog
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{product.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {product.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(product.price)}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.inventoryQuantity || 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No products yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}