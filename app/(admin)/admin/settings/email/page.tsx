import { Suspense } from 'react'
import { getEmailSettings } from '@/lib/admin/queries/settings'
import EmailSettingsForm from '@/components/admin/settings/email-settings-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function EmailSettingsPage() {
  const settings = await getEmailSettings()

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
          <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
          <p className="text-muted-foreground">
            Configure SMTP settings, email templates, and notification preferences
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading email settings...</div>}>
        <EmailSettingsForm settings={settings} />
      </Suspense>
    </div>
  )
}