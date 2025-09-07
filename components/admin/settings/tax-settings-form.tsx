'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Calculator,
  Percent,
  Globe
} from 'lucide-react'
import { toast } from 'sonner'
import { updateTaxSettings } from '@/lib/admin/actions/settings'

interface TaxSettingsFormProps {
  settings: Record<string, any>
}

export default function TaxSettingsForm({ settings }: TaxSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Tax Calculation - matching action parameters
    enableTax: settings.enableTax ?? true,
    taxCalculation: settings.taxCalculation || 'exclusive',
    displayTaxInclusive: settings.displayTaxInclusive ?? false,
    
    // Default Tax Rates
    defaultTaxRate: settings.defaultTaxRate || 0,
    
    // Advanced Settings
    enableTaxByLocation: settings.enableTaxByLocation ?? true,
    enableDigitalTax: settings.enableDigitalTax ?? false,
    taxExemptRoles: settings.taxExemptRoles || [],
    
    // Display settings
    displayTaxLabel: settings.displayTaxLabel || 'Tax',
    roundTaxAtSubtotal: settings.roundTaxAtSubtotal ?? false,
    
    // Regional Settings  
    taxBasisAddress: settings.taxBasisAddress || 'shipping',
    defaultCountry: settings.defaultCountry || 'US',
    defaultState: settings.defaultState || '',
    
    // Shipping tax
    shippingTaxable: settings.shippingTaxable ?? true,
    shippingTaxRate: settings.shippingTaxRate || 0,
    compoundTax: settings.compoundTax ?? false
  })

  const handleSave = async () => {
    setLoading(true)
    
    try {
      const result = await updateTaxSettings(formData)
      
      if (result.success) {
        toast.success('Tax settings updated successfully')
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

  const countries = [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AU', name: 'Australia' },
    { code: 'IN', name: 'India' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' }
  ]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="rates">Default Rates</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Calculator className="h-5 w-5 text-blue-500" />
                <div>
                  <Label htmlFor="enableTax">Enable Tax Calculation</Label>
                  <p className="text-sm text-muted-foreground">
                    Apply taxes to orders and products
                  </p>
                </div>
              </div>
              <Switch
                id="enableTax"
                checked={formData.enableTax}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  enableTax: checked 
                }))}
              />
            </div>

            {formData.enableTax && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="taxCalculation">Tax Calculation Method</Label>
                    <Select
                      value={formData.taxCalculation}
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        taxCalculation: value 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exclusive">Tax Exclusive (Add tax to price)</SelectItem>
                        <SelectItem value="inclusive">Tax Inclusive (Price includes tax)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayTaxLabel">Tax Display Label</Label>
                    <Input
                      id="displayTaxLabel"
                      value={formData.displayTaxLabel}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        displayTaxLabel: e.target.value 
                      }))}
                      placeholder="Tax, VAT, GST, etc."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="displayTaxInclusive">Display Prices Including Tax</Label>
                    <p className="text-sm text-muted-foreground">
                      Show tax-inclusive prices in the storefront
                    </p>
                  </div>
                  <Switch
                    id="displayTaxInclusive"
                    checked={formData.displayTaxInclusive}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      displayTaxInclusive: checked 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxBasisAddress">Calculate Tax Based On</Label>
                  <Select
                    value={formData.taxBasisAddress}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      taxBasisAddress: value 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shipping">Shipping Address</SelectItem>
                      <SelectItem value="billing">Billing Address</SelectItem>
                      <SelectItem value="store">Store Address</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rates" className="space-y-6">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultTaxRate">Default Tax Rate (%)</Label>
                <div className="relative">
                  <Input
                    id="defaultTaxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.defaultTaxRate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      defaultTaxRate: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0.00"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingTaxRate">Shipping Tax Rate (%)</Label>
                <div className="relative">
                  <Input
                    id="shippingTaxRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.shippingTaxRate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      shippingTaxRate: parseFloat(e.target.value) || 0 
                    }))}
                    placeholder="0.00"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="shippingTaxable">Tax Shipping</Label>
                <p className="text-sm text-muted-foreground">
                  Apply tax to shipping costs
                </p>
              </div>
              <Switch
                id="shippingTaxable"
                checked={formData.shippingTaxable}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  shippingTaxable: checked 
                }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultCountry">Default Country</Label>
                <Select
                  value={formData.defaultCountry}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    defaultCountry: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultState">Default State/Province</Label>
                <Input
                  id="defaultState"
                  value={formData.defaultState}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    defaultState: e.target.value 
                  }))}
                  placeholder="State or Province"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="enableDigitalTax">Digital Services Tax</Label>
                <p className="text-sm text-muted-foreground">
                  Apply special tax rates for digital products and services
                </p>
              </div>
              <Switch
                id="enableDigitalTax"
                checked={formData.enableDigitalTax}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  enableDigitalTax: checked 
                }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="compoundTax">Compound Tax</Label>
                <p className="text-sm text-muted-foreground">
                  Calculate tax on tax (for regions with multiple tax layers)
                </p>
              </div>
              <Switch
                id="compoundTax"
                checked={formData.compoundTax}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  compoundTax: checked 
                }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="roundTaxAtSubtotal">Round Tax at Subtotal</Label>
                <p className="text-sm text-muted-foreground">
                  Round tax calculation at subtotal level instead of line level
                </p>
              </div>
              <Switch
                id="roundTaxAtSubtotal"
                checked={formData.roundTaxAtSubtotal}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  roundTaxAtSubtotal: checked 
                }))}
              />
            </div>
          </div>
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
              Save Tax Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}