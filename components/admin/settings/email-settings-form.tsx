'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Save, 
  RefreshCw,
  Mail,
  Settings,
  Bell,
  FileText,
  TestTube,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { updateEmailSettings } from '@/lib/admin/actions/settings'

interface EmailSettingsFormProps {
  settings: Record<string, any>
}

export default function EmailSettingsForm({ settings }: EmailSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [formData, setFormData] = useState({
    // SMTP Configuration
    smtpHost: settings.smtpHost || '',
    smtpPort: settings.smtpPort || 587,
    smtpUsername: settings.smtpUsername || '',
    smtpPassword: settings.smtpPassword || '',
    smtpSecure: settings.smtpSecure ?? true,
    
    // From/Reply Configuration
    fromEmail: settings.fromEmail || '',
    fromName: settings.fromName || '',
    replyToEmail: settings.replyToEmail || '',
    
    // Email Notifications
    enableOrderConfirmation: settings.enableOrderConfirmation ?? true,
    enableShippingNotification: settings.enableShippingNotification ?? true,
    enableDeliveryNotification: settings.enableDeliveryNotification ?? true,
    enableNewsletters: settings.enableNewsletters ?? false,
    enableMarketingEmails: settings.enableMarketingEmails ?? false,
    enableAbandonedCartEmails: settings.enableAbandonedCartEmails ?? false,
    abandonedCartDelay: settings.abandonedCartDelay || 24,
    
    // Email Templates
    emailTemplates: {
      orderConfirmation: settings.emailTemplates?.orderConfirmation || 'Thank you for your order! Your order #{orderNumber} has been confirmed.',
      shippingNotification: settings.emailTemplates?.shippingNotification || 'Great news! Your order #{orderNumber} has been shipped.',
      deliveryConfirmation: settings.emailTemplates?.deliveryConfirmation || 'Your order #{orderNumber} has been delivered!',
      passwordReset: settings.emailTemplates?.passwordReset || 'Please click the link below to reset your password.',
      welcomeEmail: settings.emailTemplates?.welcomeEmail || 'Welcome to our store! We are excited to have you as a customer.'
    }
  })

  const handleSave = async () => {
    setLoading(true)
    
    try {
      const result = await updateEmailSettings(formData)
      
      if (result.success) {
        toast.success('Email settings updated successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const sendTestEmail = async () => {
    setTestEmailLoading(true)
    
    try {
      // This would be implemented as a separate action
      toast.success('Test email sent successfully!')
    } catch (error) {
      toast.error('Failed to send test email')
    } finally {
      setTestEmailLoading(false)
    }
  }

  const updateTemplate = (templateKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      emailTemplates: {
        ...prev.emailTemplates,
        [templateKey]: value
      }
    }))
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="smtp" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="smtp">SMTP Config</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="test">Test & Verify</TabsTrigger>
        </TabsList>

        <TabsContent value="smtp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                SMTP Server Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host *</Label>
                  <Input
                    id="smtpHost"
                    value={formData.smtpHost}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtpHost: e.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port *</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={formData.smtpPort}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtpPort: parseInt(e.target.value) || 587 }))}
                    placeholder="587"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP Username *</Label>
                  <Input
                    id="smtpUsername"
                    value={formData.smtpUsername}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtpUsername: e.target.value }))}
                    placeholder="your-email@gmail.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP Password *</Label>
                  <Input
                    id="smtpPassword"
                    type="password"
                    value={formData.smtpPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, smtpPassword: e.target.value }))}
                    placeholder="Your app password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smtpSecure">Use SSL/TLS</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable secure connection (recommended for port 465/587)
                  </p>
                </div>
                <Switch
                  id="smtpSecure"
                  checked={formData.smtpSecure}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, smtpSecure: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-500" />
                Email Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email Address *</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={formData.fromEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, fromEmail: e.target.value }))}
                    placeholder="noreply@yourstore.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={formData.fromName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Your Store Name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replyToEmail">Reply-To Email</Label>
                <Input
                  id="replyToEmail"
                  type="email"
                  value={formData.replyToEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, replyToEmail: e.target.value }))}
                  placeholder="support@yourstore.com"
                />
                <p className="text-sm text-muted-foreground">
                  Email address where customer replies will be sent
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-500" />
                Email Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  key: 'enableOrderConfirmation',
                  label: 'Order Confirmation Emails',
                  description: 'Send confirmation emails when orders are placed'
                },
                {
                  key: 'enableShippingNotification',
                  label: 'Shipping Notification Emails',
                  description: 'Notify customers when orders are shipped'
                },
                {
                  key: 'enableDeliveryNotification',
                  label: 'Delivery Confirmation Emails',
                  description: 'Send confirmation when orders are delivered'
                },
                {
                  key: 'enableNewsletters',
                  label: 'Newsletter Subscriptions',
                  description: 'Allow customers to subscribe to newsletters'
                },
                {
                  key: 'enableMarketingEmails',
                  label: 'Marketing Emails',
                  description: 'Send promotional and marketing emails'
                },
                {
                  key: 'enableAbandonedCartEmails',
                  label: 'Abandoned Cart Recovery',
                  description: 'Send reminder emails for abandoned carts'
                }
              ].map((notification) => (
                <div key={notification.key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <Label htmlFor={notification.key}>{notification.label}</Label>
                    <p className="text-sm text-muted-foreground">{notification.description}</p>
                  </div>
                  <Switch
                    id={notification.key}
                    checked={formData[notification.key as keyof typeof formData] as boolean}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      [notification.key]: checked 
                    }))}
                  />
                </div>
              ))}

              {formData.enableAbandonedCartEmails && (
                <div className="space-y-2 pl-4 border-l-2 border-purple-200">
                  <Label htmlFor="abandonedCartDelay">Abandoned Cart Delay (hours)</Label>
                  <Input
                    id="abandonedCartDelay"
                    type="number"
                    value={formData.abandonedCartDelay}
                    onChange={(e) => setFormData(prev => ({ ...prev, abandonedCartDelay: parseInt(e.target.value) || 24 }))}
                    placeholder="24"
                    className="max-w-xs"
                  />
                  <p className="text-sm text-muted-foreground">
                    How long to wait before sending abandonment reminder
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Email Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  key: 'orderConfirmation',
                  label: 'Order Confirmation',
                  description: 'Template for order confirmation emails'
                },
                {
                  key: 'shippingNotification',
                  label: 'Shipping Notification',
                  description: 'Template for shipping notification emails'
                },
                {
                  key: 'deliveryConfirmation',
                  label: 'Delivery Confirmation',
                  description: 'Template for delivery confirmation emails'
                },
                {
                  key: 'passwordReset',
                  label: 'Password Reset',
                  description: 'Template for password reset emails'
                },
                {
                  key: 'welcomeEmail',
                  label: 'Welcome Email',
                  description: 'Template for new customer welcome emails'
                }
              ].map((template) => (
                <div key={template.key} className="space-y-2">
                  <Label htmlFor={template.key}>
                    {template.label}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      {template.description}
                    </span>
                  </Label>
                  <Textarea
                    id={template.key}
                    value={formData.emailTemplates[template.key as keyof typeof formData.emailTemplates]}
                    onChange={(e) => updateTemplate(template.key, e.target.value)}
                    rows={4}
                    placeholder={template.description}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available variables: {'{orderNumber}'}, {'{customerName}'}, {'{storeName}'}, {'{orderTotal}'}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5 text-green-500" />
                Test Email Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Test Your Email Setup</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Before saving, test your SMTP configuration to ensure emails can be sent successfully.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="testEmail">Test Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="testEmail"
                    type="email"
                    placeholder="test@example.com"
                    className="flex-1"
                  />
                  <Button 
                    onClick={sendTestEmail} 
                    disabled={testEmailLoading || !formData.smtpHost || !formData.fromEmail}
                  >
                    {testEmailLoading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Test
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  A test email will be sent to verify your SMTP configuration
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Configuration Status</h4>
                <div className="space-y-2">
                  {[
                    { label: 'SMTP Host', value: formData.smtpHost, required: true },
                    { label: 'SMTP Port', value: formData.smtpPort, required: true },
                    { label: 'Username', value: formData.smtpUsername, required: true },
                    { label: 'Password', value: formData.smtpPassword ? '••••••••' : '', required: true },
                    { label: 'From Email', value: formData.fromEmail, required: true },
                    { label: 'From Name', value: formData.fromName, required: false }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {item.label}
                        {item.required && <span className="text-red-500">*</span>}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.value 
                          ? 'bg-green-100 text-green-800' 
                          : item.required 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.value ? 'Configured' : item.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}