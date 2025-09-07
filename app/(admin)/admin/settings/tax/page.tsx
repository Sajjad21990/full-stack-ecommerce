import { Suspense } from 'react'
import { getTaxSettings, getTaxZones } from '@/lib/admin/queries/settings'
import TaxSettingsForm from '@/components/admin/settings/tax-settings-form'
import TaxZonesTable from '@/components/admin/settings/tax-zones-table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'

export default async function TaxSettingsPage() {
  const [settings, zones] = await Promise.all([
    getTaxSettings(),
    getTaxZones()
  ])

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
          <h1 className="text-3xl font-bold tracking-tight">Tax Settings</h1>
          <p className="text-muted-foreground">
            Configure tax rates, zones, and calculation methods
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tax Configuration</CardTitle>
            <CardDescription>
              Global tax settings and calculation methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading tax settings...</div>}>
              <TaxSettingsForm settings={settings} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Tax Rates</CardTitle>
            <CardDescription>
              Common tax rates for your region
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">GST (India)</p>
                  <p className="text-sm text-muted-foreground">Goods and Services Tax</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">18%</p>
                  <p className="text-sm text-muted-foreground">Standard Rate</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">VAT (EU)</p>
                  <p className="text-sm text-muted-foreground">Value Added Tax</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">20%</p>
                  <p className="text-sm text-muted-foreground">Average Rate</p>
                </div>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Sales Tax (US)</p>
                  <p className="text-sm text-muted-foreground">State Sales Tax</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">7%</p>
                  <p className="text-sm text-muted-foreground">Average Rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tax Zones</CardTitle>
              <CardDescription>
                Configure tax rates by region or country
              </CardDescription>
            </div>
            <Link href="/admin/settings/tax/zones/create">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Zone
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading tax zones...</div>}>
            <TaxZonesTable zones={zones} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}