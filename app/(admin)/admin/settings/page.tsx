import { Suspense } from 'react'
import { getAllSettings } from '@/lib/admin/queries/settings'
import SettingsNavigation from '@/components/admin/settings/settings-navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Store,
  Truck,
  Mail,
  Search,
  CreditCard,
  Calculator,
  Shield,
  Settings as SettingsIcon
} from 'lucide-react'

export default async function SettingsPage() {
  const settings = await getAllSettings()

  const settingsCategories = [
    {
      id: 'store',
      name: 'Store Settings',
      description: 'Basic store information and preferences',
      icon: Store,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      href: '/admin/settings/store'
    },
    {
      id: 'shipping',
      name: 'Shipping & Delivery',
      description: 'Configure shipping zones, rates, and methods',
      icon: Truck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      href: '/admin/settings/shipping'
    },
    {
      id: 'email',
      name: 'Email Settings',
      description: 'SMTP configuration and email templates',
      icon: Mail,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      href: '/admin/settings/email'
    },
    {
      id: 'seo',
      name: 'SEO & Analytics',
      description: 'Search engine optimization and tracking',
      icon: Search,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      href: '/admin/settings/seo'
    },
    {
      id: 'payment',
      name: 'Payment Settings',
      description: 'Payment gateways and processing',
      icon: CreditCard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      href: '/admin/payments/settings'
    },
    {
      id: 'tax',
      name: 'Tax Configuration',
      description: 'Tax rates and calculation rules',
      icon: Calculator,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      href: '/admin/settings/tax'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings & Configuration</h1>
          <p className="text-muted-foreground">
            Configure your store settings and preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>All changes are automatically saved</span>
          </div>
        </div>
      </div>

      {/* Settings Categories Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.map((category) => {
          const Icon = category.icon
          const categorySettings = settings[category.id as keyof typeof settings]
          const settingsCount = Object.keys(categorySettings || {}).length
          
          return (
            <Card key={category.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${category.bgColor}`}>
                    <Icon className={`h-6 w-6 ${category.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {category.description}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {settingsCount} setting{settingsCount !== 1 ? 's' : ''} configured
                  </div>
                  <a 
                    href={category.href}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Configure →
                  </a>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Settings Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Store Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Store Name</span>
              <span className="font-medium">{settings.store.name || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Maintenance Mode</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                settings.store.maintenanceMode 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {settings.store.maintenanceMode ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Currency</span>
              <span className="font-medium">{settings.store.currency || 'USD'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Guest Checkout</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                settings.store.allowGuestCheckout 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {settings.store.allowGuestCheckout ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Email Configuration</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                settings.email.smtpHost 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {settings.email.smtpHost ? 'Configured' : 'Needs Setup'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Payment Gateway</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                settings.payment.razorpayKeyId 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {settings.payment.razorpayKeyId ? 'Configured' : 'Needs Setup'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Shipping Zones</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                settings.shipping.enableShipping 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {settings.shipping.enableShipping ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>SEO Optimization</span>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                settings.seo.metaTitle 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {settings.seo.metaTitle ? 'Configured' : 'Needs Setup'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}