import { Metadata } from 'next'
import { AccountSettings } from '@/components/storefront/account/account-settings'
import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'
import { Settings } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Account Settings | Manage Your Profile',
  description: 'Update your profile information, preferences, and account settings.',
}

export default function AccountSettingsPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Account', href: '/account' },
    { label: 'Settings' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbs} />
          <div className="flex items-center gap-3 mt-4">
            <Settings className="w-6 h-6" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
              <p className="text-gray-600">Manage your profile and preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AccountSettings />
      </div>
    </div>
  )
}