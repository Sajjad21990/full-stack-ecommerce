import { Suspense } from 'react'
import { getStoreSettings } from '@/lib/admin/queries/settings'
import StoreSettingsForm from '@/components/admin/settings/store-settings-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function StoreSettingsPage() {
  const settings = await getStoreSettings()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
          <p className="text-muted-foreground">
            Configure your store's basic information and preferences
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading settings...</div>}>
        <StoreSettingsForm settings={settings} />
      </Suspense>
    </div>
  )
}