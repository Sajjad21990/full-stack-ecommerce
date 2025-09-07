import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  CreditCard,
  Bell,
  ArrowRight,
  ShoppingBag,
  Star,
  Gift,
  Settings
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'My Account | Customer Dashboard',
  description: 'Manage your account, orders, and preferences.',
}

// Mock data - in real app, fetch from database based on authenticated user
const mockCustomer = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+91 9876543210',
  joinedAt: new Date('2024-01-15'),
  totalOrders: 12,
  totalSpent: 28497,
  loyaltyPoints: 284,
  membershipTier: 'Gold'
}

const recentOrders = [
  {
    id: '1',
    orderNumber: 'ORD-20240301-0001',
    status: 'delivered',
    totalAmount: 2497,
    itemCount: 3,
    createdAt: new Date('2024-03-01'),
    items: [
      { productTitle: 'Premium Wireless Headphones', image: '/api/placeholder/60/60' }
    ]
  },
  {
    id: '2',
    orderNumber: 'ORD-20240215-0002',
    status: 'shipped',
    totalAmount: 1899,
    itemCount: 2,
    createdAt: new Date('2024-02-15'),
    items: [
      { productTitle: 'Smart Watch', image: '/api/placeholder/60/60' }
    ]
  },
  {
    id: '3',
    orderNumber: 'ORD-20240201-0003',
    status: 'processing',
    totalAmount: 799,
    itemCount: 1,
    createdAt: new Date('2024-02-01'),
    items: [
      { productTitle: 'Bluetooth Speaker', image: '/api/placeholder/60/60' }
    ]
  }
]

const accountMenuItems = [
  {
    title: 'Orders',
    description: 'Track and manage your orders',
    href: '/account/orders',
    icon: Package,
    count: mockCustomer.totalOrders
  },
  {
    title: 'Wishlist',
    description: 'Saved items for later',
    href: '/account/wishlist',
    icon: Heart,
    count: 5
  },
  {
    title: 'Addresses',
    description: 'Manage shipping addresses',
    href: '/account/addresses',
    icon: MapPin,
    count: 2
  },
  {
    title: 'Payment Methods',
    description: 'Manage payment options',
    href: '/account/payment-methods',
    icon: CreditCard,
    count: 3
  },
  {
    title: 'Account Settings',
    description: 'Update your profile and preferences',
    href: '/account/settings',
    icon: Settings,
    count: null
  },
  {
    title: 'Notifications',
    description: 'Email and SMS preferences',
    href: '/account/notifications',
    icon: Bell,
    count: null
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800'
    case 'shipped':
      return 'bg-blue-100 text-blue-800'
    case 'processing':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getMembershipColor = (tier: string) => {
  switch (tier) {
    case 'Gold':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'Silver':
      return 'bg-gray-100 text-gray-800 border-gray-300'
    case 'Platinum':
      return 'bg-purple-100 text-purple-800 border-purple-300'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-300'
  }
}

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {mockCustomer.firstName}!
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your account and track your orders
              </p>
            </div>
            <Badge className={getMembershipColor(mockCustomer.membershipTier)}>
              {mockCustomer.membershipTier} Member
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Account Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{mockCustomer.totalOrders}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{formatPrice(mockCustomer.totalSpent)}</div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{mockCustomer.loyaltyPoints}</div>
                  <div className="text-sm text-gray-600">Loyalty Points</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Orders</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/account/orders">
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0">
                          {/* Order icon or first item image */}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{order.orderNumber}</div>
                          <div className="text-sm text-gray-600">
                            {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} • {formatDate(order.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-semibold">{formatPrice(order.totalAmount)}</div>
                          <Badge className={`${getStatusColor(order.status)} text-xs`}>
                            {order.status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/account/orders/${order.orderNumber}`}>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Loyalty Program */}
            <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="w-5 h-5" />
                      <span className="font-semibold">Loyalty Rewards</span>
                    </div>
                    <div className="text-2xl font-bold mb-1">{mockCustomer.loyaltyPoints} Points</div>
                    <div className="text-purple-100">Earn 1 point for every ₹10 spent</div>
                  </div>
                  <Button variant="secondary" size="sm">
                    Redeem Points
                  </Button>
                </div>
                <div className="mt-4 bg-white/20 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: '68%' }}></div>
                </div>
                <div className="text-sm mt-2 text-purple-100">
                  216 more points to reach Platinum status
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="font-medium text-gray-900">
                      {mockCustomer.firstName} {mockCustomer.lastName}
                    </div>
                    <div className="text-sm text-gray-600">{mockCustomer.email}</div>
                  </div>
                  <div className="text-sm text-gray-600">
                    Member since {formatDate(mockCustomer.joinedAt)}
                  </div>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/account/settings">Edit Profile</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {accountMenuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <Icon className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-600">{item.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.count && (
                            <Badge variant="secondary" className="text-xs">
                              {item.count}
                            </Badge>
                          )}
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Support */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div className="font-medium text-gray-900 mb-1">Need Help?</div>
                <div className="text-sm text-gray-600 mb-4">
                  Our customer support team is here to help you
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}