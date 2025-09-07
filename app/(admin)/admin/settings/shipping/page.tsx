import { Suspense } from 'react'
import { getShippingSettings } from '@/lib/admin/queries/settings'
import ShippingSettingsForm from '@/components/admin/settings/shipping-settings-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ShippingSettingsPage() {
  const settings = await getShippingSettings()

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
          <h1 className="text-3xl font-bold tracking-tight">Shipping Settings</h1>
          <p className="text-muted-foreground">
            Configure shipping options, zones, rates, and delivery methods
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading shipping settings...</div>}>
        <ShippingSettingsForm settings={settings} />
      </Suspense>
    </div>
  )
}