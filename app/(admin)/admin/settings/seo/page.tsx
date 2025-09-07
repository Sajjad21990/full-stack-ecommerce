import { Suspense } from 'react'
import { getSEOSettings } from '@/lib/admin/queries/settings'
import SEOSettingsForm from '@/components/admin/settings/seo-settings-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function SEOSettingsPage() {
  const settings = await getSEOSettings()

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
          <h1 className="text-3xl font-bold tracking-tight">SEO Settings</h1>
          <p className="text-muted-foreground">
            Configure search engine optimization, meta tags, and analytics tracking
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading SEO settings...</div>}>
        <SEOSettingsForm settings={settings} />
      </Suspense>
    </div>
  )
}