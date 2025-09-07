'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
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
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Settings,
  CreditCard,
  Globe,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'
import { updatePaymentSettings } from '@/lib/admin/actions/payments'

interface PaymentSettingsFormProps {
  settings: Record<string, any>
}

export default function PaymentSettingsForm({ settings }: PaymentSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState({
    // Razorpay Settings
    razorpayKeyId: settings.razorpayKeyId || '',
    razorpayKeySecret: settings.razorpayKeySecret || '',
    webhookSecret: settings.webhookSecret || '',
    
    // General Settings
    enableTestMode: settings.enableTestMode || false,
    autoCapture: settings.autoCapture || true,
    currency: settings.currency || 'INR',
    minAmount: settings.minAmount || 1,
    maxAmount: settings.maxAmount || 500000,
    
    // Payment Methods
    enabledPaymentMethods: settings.enabledPaymentMethods || [
      'card', 'upi', 'netbanking', 'wallet'
    ]
  })

  const handleSave = async () => {
    setLoading(true)
    
    try {
      const result = await updatePaymentSettings(formData)
      
      if (result.success) {
        toast.success('Payment settings updated successfully')
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

  const toggleSecret = (field: string) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const handleMethodToggle = (method: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      enabledPaymentMethods: checked
        ? [...prev.enabledPaymentMethods, method]
        : prev.enabledPaymentMethods.filter(m => m !== method)
    }))
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="gateway" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gateway">Gateway</TabsTrigger>
          <TabsTrigger value="methods">Methods</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="gateway" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                Razorpay Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="keyId">Key ID</Label>
                  <Input
                    id="keyId"
                    value={formData.razorpayKeyId}
                    onChange={(e) => setFormData(prev => ({ ...prev, razorpayKeyId: e.target.value }))}
                    placeholder="rzp_test_..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="keySecret">Key Secret</Label>
                  <div className="relative">
                    <Input
                      id="keySecret"
                      type={showSecrets.keySecret ? 'text' : 'password'}
                      value={formData.razorpayKeySecret}
                      onChange={(e) => setFormData(prev => ({ ...prev, razorpayKeySecret: e.target.value }))}
                      placeholder="Enter key secret"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => toggleSecret('keySecret')}
                    >
                      {showSecrets.keySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Webhook Secret</Label>
                <div className="relative">
                  <Input
                    id="webhookSecret"
                    type={showSecrets.webhookSecret ? 'text' : 'password'}
                    value={formData.webhookSecret}
                    onChange={(e) => setFormData(prev => ({ ...prev, webhookSecret: e.target.value }))}
                    placeholder="Enter webhook secret"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleSecret('webhookSecret')}
                  >
                    {showSecrets.webhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="testMode"
                  checked={formData.enableTestMode}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableTestMode: checked }))}
                />
                <Label htmlFor="testMode" className="flex items-center gap-2">
                  Test Mode
                  {formData.enableTestMode && (
                    <div className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      <AlertTriangle className="h-3 w-3" />
                      Active
                    </div>
                  )}
                </Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { id: 'card', label: 'Credit/Debit Cards', description: 'Visa, Mastercard, RuPay, etc.' },
                  { id: 'upi', label: 'UPI', description: 'PhonePe, GooglePay, Paytm UPI' },
                  { id: 'netbanking', label: 'Net Banking', description: 'All major banks supported' },
                  { id: 'wallet', label: 'Digital Wallets', description: 'Paytm, Mobikwik, etc.' },
                  { id: 'emi', label: 'EMI', description: 'Easy installments' },
                  { id: 'cardless_emi', label: 'Cardless EMI', description: 'EMI without cards' }
                ].map((method) => (
                  <div key={method.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={method.id}
                      checked={formData.enabledPaymentMethods.includes(method.id)}
                      onCheckedChange={(checked) => handleMethodToggle(method.id, checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={method.id} className="font-medium">
                        {method.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limits" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-500" />
                Transaction Limits & Currency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minAmount">Minimum Amount</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    step="0.01"
                    value={formData.minAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, minAmount: parseFloat(e.target.value) || 1 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxAmount">Maximum Amount</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    step="0.01"
                    value={formData.maxAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxAmount: parseFloat(e.target.value) || 500000 }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoCapture"
                  checked={formData.autoCapture}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoCapture: checked }))}
                />
                <div className="flex-1">
                  <Label htmlFor="autoCapture">Auto Capture Payments</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically capture authorized payments. Disable for manual review.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                Security & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">PCI DSS Compliance</h4>
                    <p className="text-sm text-muted-foreground">Payment Card Industry Data Security Standard</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Compliant</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">SSL Certificate</h4>
                    <p className="text-sm text-muted-foreground">Secure data transmission</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">3D Secure</h4>
                    <p className="text-sm text-muted-foreground">Additional authentication for card payments</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium text-green-600">Enabled</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-medium text-blue-800">Security Best Practices</h4>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• All API keys are encrypted at rest</li>
                  <li>• Webhook signatures are verified</li>
                  <li>• Payment data is tokenized</li>
                  <li>• Regular security audits are performed</li>
                </ul>
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