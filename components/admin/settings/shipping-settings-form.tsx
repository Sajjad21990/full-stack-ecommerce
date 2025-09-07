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
  Truck,
  MapPin,
  Package,
  Clock,
  Plus,
  Trash2,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { updateShippingSettings } from '@/lib/admin/actions/settings'

interface ShippingSettingsFormProps {
  settings: Record<string, any>
}

export default function ShippingSettingsForm({ settings }: ShippingSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Basic Shipping
    enableShipping: settings.enableShipping ?? true,
    freeShippingThreshold: settings.freeShippingThreshold || 100,
    shippingCalculation: settings.shippingCalculation || 'flat',
    flatRate: settings.flatRate || 10,
    
    // Local Delivery
    enableLocalDelivery: settings.enableLocalDelivery ?? false,
    localDeliveryFee: settings.localDeliveryFee || 5,
    localDeliveryRadius: settings.localDeliveryRadius || 25,
    
    // In-Store Pickup
    enableInStorePickup: settings.enableInStorePickup ?? true,
    pickupLocations: settings.pickupLocations || [{
      name: 'Main Store',
      address: '123 Main St, City, State 12345',
      phone: '+1 (555) 123-4567',
      hours: 'Mon-Fri: 9AM-6PM, Sat: 10AM-4PM'
    }],
    
    // Express Shipping
    enableExpressShipping: settings.enableExpressShipping ?? false,
    expressShippingFee: settings.expressShippingFee || 25,
    processingTime: settings.processingTime || 1,
    
    // Shipping Zones
    shippingZones: settings.shippingZones || [{
      name: 'Domestic',
      countries: ['United States'],
      rates: [
        { name: 'Standard Shipping', price: 10, estimatedDays: '5-7 business days' },
        { name: 'Express Shipping', price: 25, estimatedDays: '2-3 business days' }
      ]
    }]
  })

  const handleSave = async () => {
    setLoading(true)
    
    try {
      const result = await updateShippingSettings(formData)
      
      if (result.success) {
        toast.success('Shipping settings updated successfully')
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

  const addPickupLocation = () => {
    setFormData(prev => ({
      ...prev,
      pickupLocations: [...prev.pickupLocations, {
        name: '',
        address: '',
        phone: '',
        hours: ''
      }]
    }))
  }

  const removePickupLocation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pickupLocations: prev.pickupLocations.filter((_, i) => i !== index)
    }))
  }

  const updatePickupLocation = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      pickupLocations: prev.pickupLocations.map((location, i) => 
        i === index ? { ...location, [field]: value } : location
      )
    }))
  }

  const addShippingZone = () => {
    setFormData(prev => ({
      ...prev,
      shippingZones: [...prev.shippingZones, {
        name: '',
        countries: [],
        rates: [{ name: 'Standard Shipping', price: 10, estimatedDays: '5-7 business days' }]
      }]
    }))
  }

  const removeShippingZone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      shippingZones: prev.shippingZones.filter((_, i) => i !== index)
    }))
  }

  const updateShippingZone = (zoneIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      shippingZones: prev.shippingZones.map((zone, i) => 
        i === zoneIndex ? { ...zone, [field]: value } : zone
      )
    }))
  }

  const addShippingRate = (zoneIndex: number) => {
    setFormData(prev => ({
      ...prev,
      shippingZones: prev.shippingZones.map((zone, i) => 
        i === zoneIndex ? {
          ...zone,
          rates: [...zone.rates, { name: '', price: 0, estimatedDays: '' }]
        } : zone
      )
    }))
  }

  const removeShippingRate = (zoneIndex: number, rateIndex: number) => {
    setFormData(prev => ({
      ...prev,
      shippingZones: prev.shippingZones.map((zone, i) => 
        i === zoneIndex ? {
          ...zone,
          rates: zone.rates.filter((_, ri) => ri !== rateIndex)
        } : zone
      )
    }))
  }

  const updateShippingRate = (zoneIndex: number, rateIndex: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      shippingZones: prev.shippingZones.map((zone, zi) => 
        zi === zoneIndex ? {
          ...zone,
          rates: zone.rates.map((rate, ri) => 
            ri === rateIndex ? { ...rate, [field]: value } : rate
          )
        } : zone
      )
    }))
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="methods">Delivery Methods</TabsTrigger>
          <TabsTrigger value="pickup">Pickup Locations</TabsTrigger>
          <TabsTrigger value="zones">Shipping Zones</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                Basic Shipping Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableShipping">Enable Shipping</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to have orders shipped to their address
                  </p>
                </div>
                <Switch
                  id="enableShipping"
                  checked={formData.enableShipping}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableShipping: checked }))}
                />
              </div>

              {formData.enableShipping && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="freeShippingThreshold">Free Shipping Threshold ($)</Label>
                      <Input
                        id="freeShippingThreshold"
                        type="number"
                        value={formData.freeShippingThreshold}
                        onChange={(e) => setFormData(prev => ({ ...prev, freeShippingThreshold: parseFloat(e.target.value) || 0 }))}
                        placeholder="100.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="shippingCalculation">Shipping Calculation Method</Label>
                      <Select
                        value={formData.shippingCalculation}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, shippingCalculation: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat">Flat Rate</SelectItem>
                          <SelectItem value="weight">By Weight</SelectItem>
                          <SelectItem value="price">By Price</SelectItem>
                          <SelectItem value="zone">By Shipping Zone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.shippingCalculation === 'flat' && (
                    <div className="space-y-2">
                      <Label htmlFor="flatRate">Flat Shipping Rate ($)</Label>
                      <Input
                        id="flatRate"
                        type="number"
                        value={formData.flatRate}
                        onChange={(e) => setFormData(prev => ({ ...prev, flatRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="10.00"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="processingTime">Processing Time (Business Days)</Label>
                    <Input
                      id="processingTime"
                      type="number"
                      value={formData.processingTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, processingTime: parseInt(e.target.value) || 1 }))}
                      placeholder="1"
                    />
                    <p className="text-sm text-muted-foreground">
                      Time needed to prepare orders before shipping
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-500" />
                Delivery Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Local Delivery */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableLocalDelivery">Local Delivery</Label>
                    <p className="text-sm text-muted-foreground">
                      Offer delivery within a specific radius
                    </p>
                  </div>
                  <Switch
                    id="enableLocalDelivery"
                    checked={formData.enableLocalDelivery}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableLocalDelivery: checked }))}
                  />
                </div>

                {formData.enableLocalDelivery && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="localDeliveryFee">Local Delivery Fee ($)</Label>
                      <Input
                        id="localDeliveryFee"
                        type="number"
                        value={formData.localDeliveryFee}
                        onChange={(e) => setFormData(prev => ({ ...prev, localDeliveryFee: parseFloat(e.target.value) || 0 }))}
                        placeholder="5.00"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="localDeliveryRadius">Delivery Radius (miles)</Label>
                      <Input
                        id="localDeliveryRadius"
                        type="number"
                        value={formData.localDeliveryRadius}
                        onChange={(e) => setFormData(prev => ({ ...prev, localDeliveryRadius: parseFloat(e.target.value) || 0 }))}
                        placeholder="25"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Express Shipping */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableExpressShipping">Express Shipping</Label>
                    <p className="text-sm text-muted-foreground">
                      Offer faster shipping for an additional fee
                    </p>
                  </div>
                  <Switch
                    id="enableExpressShipping"
                    checked={formData.enableExpressShipping}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableExpressShipping: checked }))}
                  />
                </div>

                {formData.enableExpressShipping && (
                  <div className="space-y-2">
                    <Label htmlFor="expressShippingFee">Express Shipping Fee ($)</Label>
                    <Input
                      id="expressShippingFee"
                      type="number"
                      value={formData.expressShippingFee}
                      onChange={(e) => setFormData(prev => ({ ...prev, expressShippingFee: parseFloat(e.target.value) || 0 }))}
                      placeholder="25.00"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pickup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-500" />
                In-Store Pickup Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableInStorePickup">Enable In-Store Pickup</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow customers to pick up orders at your store locations
                  </p>
                </div>
                <Switch
                  id="enableInStorePickup"
                  checked={formData.enableInStorePickup}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableInStorePickup: checked }))}
                />
              </div>

              {formData.enableInStorePickup && (
                <div className="space-y-4">
                  {formData.pickupLocations.map((location, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Pickup Location {index + 1}</h4>
                        {formData.pickupLocations.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePickupLocation(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Location Name</Label>
                          <Input
                            value={location.name}
                            onChange={(e) => updatePickupLocation(index, 'name', e.target.value)}
                            placeholder="Main Store"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input
                            value={location.phone}
                            onChange={(e) => updatePickupLocation(index, 'phone', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label>Address</Label>
                          <Input
                            value={location.address}
                            onChange={(e) => updatePickupLocation(index, 'address', e.target.value)}
                            placeholder="123 Main St, City, State 12345"
                          />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                          <Label>Business Hours</Label>
                          <Input
                            value={location.hours}
                            onChange={(e) => updatePickupLocation(index, 'hours', e.target.value)}
                            placeholder="Mon-Fri: 9AM-6PM, Sat: 10AM-4PM"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  <Button variant="outline" onClick={addPickupLocation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Pickup Location
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-500" />
                Shipping Zones & Rates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.shippingZones.map((zone, zoneIndex) => (
                <Card key={zoneIndex} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Shipping Zone {zoneIndex + 1}</h4>
                    {formData.shippingZones.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeShippingZone(zoneIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Zone Name</Label>
                        <Input
                          value={zone.name}
                          onChange={(e) => updateShippingZone(zoneIndex, 'name', e.target.value)}
                          placeholder="Domestic"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Countries (comma-separated)</Label>
                        <Input
                          value={zone.countries.join(', ')}
                          onChange={(e) => updateShippingZone(zoneIndex, 'countries', e.target.value.split(', ').filter(c => c.trim()))}
                          placeholder="United States, Canada"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Shipping Rates</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addShippingRate(zoneIndex)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Rate
                        </Button>
                      </div>
                      
                      {zone.rates.map((rate, rateIndex) => (
                        <div key={rateIndex} className="grid gap-3 md:grid-cols-4 p-3 border rounded">
                          <div className="space-y-1">
                            <Label className="text-xs">Method Name</Label>
                            <Input
                              value={rate.name}
                              onChange={(e) => updateShippingRate(zoneIndex, rateIndex, 'name', e.target.value)}
                              placeholder="Standard Shipping"
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs">Price ($)</Label>
                            <Input
                              type="number"
                              value={rate.price}
                              onChange={(e) => updateShippingRate(zoneIndex, rateIndex, 'price', parseFloat(e.target.value) || 0)}
                              placeholder="10.00"
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs">Estimated Delivery</Label>
                            <Input
                              value={rate.estimatedDays}
                              onChange={(e) => updateShippingRate(zoneIndex, rateIndex, 'estimatedDays', e.target.value)}
                              placeholder="5-7 business days"
                              className="text-sm"
                            />
                          </div>
                          
                          <div className="flex items-end">
                            {zone.rates.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeShippingRate(zoneIndex, rateIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
              
              <Button variant="outline" onClick={addShippingZone}>
                <Plus className="h-4 w-4 mr-2" />
                Add Shipping Zone
              </Button>
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