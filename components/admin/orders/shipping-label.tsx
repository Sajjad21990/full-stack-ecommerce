'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Printer, Package, Download, Mail, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { generateShippingLabel, updateShipment } from '@/lib/admin/actions/orders'
import { formatDate } from '@/lib/utils'

interface ShippingLabelProps {
  order: any
  shipment?: any
}

const carriers = [
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'dhl', label: 'DHL' },
  { value: 'usps', label: 'USPS' },
  { value: 'bluedart', label: 'Blue Dart' },
  { value: 'dtdc', label: 'DTDC' },
  { value: 'delhivery', label: 'Delhivery' },
  { value: 'ecom-express', label: 'Ecom Express' },
]

const services = {
  fedex: ['Standard Overnight', 'Priority Overnight', 'Ground'],
  ups: ['Next Day Air', '2nd Day Air', 'Ground'],
  dhl: ['Express', 'Economy'],
  usps: ['Priority Mail', 'First Class', 'Ground'],
  bluedart: ['Express', 'Surface'],
  dtdc: ['Express', 'Economy'],
  delhivery: ['Express', 'Surface'],
  'ecom-express': ['Next Day', 'Standard'],
}

export default function ShippingLabel({ order, shipment }: ShippingLabelProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [labelData, setLabelData] = useState({
    carrier: shipment?.carrier || '',
    service: shipment?.service || '',
    trackingNumber: shipment?.trackingNumber || '',
    trackingUrl: shipment?.trackingUrl || '',
    weight: '',
    dimensions: {
      length: '',
      width: '',
      height: ''
    },
    packageType: 'box',
    notes: ''
  })

  const handleGenerateLabel = async () => {
    if (!labelData.carrier || !labelData.service) {
      toast.error('Please select carrier and service')
      return
    }

    setLoading(true)
    try {
      const result = await generateShippingLabel({
        orderId: order.id,
        carrier: labelData.carrier,
        service: labelData.service,
        trackingNumber: labelData.trackingNumber,
        trackingUrl: labelData.trackingUrl,
        weight: parseFloat(labelData.weight) || undefined,
        dimensions: labelData.dimensions,
        packageType: labelData.packageType,
        notes: labelData.notes
      })

      if (result.success) {
        toast.success('Shipping label generated successfully')
        
        // Download the label
        if (result.labelUrl) {
          window.open(result.labelUrl, '_blank')
        }
        
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to generate shipping label')
      }
    } catch (error) {
      console.error('Error generating label:', error)
      toast.error('An error occurred while generating the label')
    } finally {
      setLoading(false)
    }
  }

  const handlePrintLabel = () => {
    if (shipment?.labelUrl) {
      window.open(shipment.labelUrl, '_blank')
    } else {
      toast.error('No shipping label available')
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Shipping Information</span>
            <div className="flex gap-2">
              {shipment?.labelUrl ? (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handlePrintLabel}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Label
                  </Button>
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Package className="h-4 w-4 mr-2" />
                        Update Shipping
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </>
              ) : (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Package className="h-4 w-4 mr-2" />
                      Generate Label
                    </Button>
                  </DialogTrigger>
                </Dialog>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {shipment ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Carrier</Label>
                  <p className="font-medium">{shipment.carrier}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Service</Label>
                  <p className="font-medium">{shipment.service}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tracking Number</Label>
                  <p className="font-medium">{shipment.trackingNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium capitalize">{shipment.status}</p>
                </div>
              </div>
              {shipment.trackingUrl && (
                <div>
                  <a 
                    href={shipment.trackingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm flex items-center gap-2"
                  >
                    <Truck className="h-4 w-4" />
                    Track Shipment
                  </a>
                </div>
              )}
              {shipment.estimatedDeliveryAt && (
                <div>
                  <Label className="text-muted-foreground">Estimated Delivery</Label>
                  <p className="font-medium">
                    {formatDate(new Date(shipment.estimatedDeliveryAt))}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No shipping label generated yet</p>
              <p className="text-sm mt-1">Click "Generate Label" to create one</p>
            </div>
          )}
        </CardContent>
      </Card>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate Shipping Label</DialogTitle>
          <DialogDescription>
            Create a shipping label for order #{order.orderNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="carrier">Carrier</Label>
              <Select
                value={labelData.carrier}
                onValueChange={(value) => 
                  setLabelData({ ...labelData, carrier: value, service: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {carriers.map(carrier => (
                    <SelectItem key={carrier.value} value={carrier.value}>
                      {carrier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="service">Service Type</Label>
              <Select
                value={labelData.service}
                onValueChange={(value) => 
                  setLabelData({ ...labelData, service: value })
                }
                disabled={!labelData.carrier}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {labelData.carrier && services[labelData.carrier as keyof typeof services]?.map(service => (
                    <SelectItem key={service} value={service}>
                      {service}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                value={labelData.trackingNumber}
                onChange={(e) => 
                  setLabelData({ ...labelData, trackingNumber: e.target.value })
                }
                placeholder="Enter tracking number"
              />
            </div>

            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={labelData.weight}
                onChange={(e) => 
                  setLabelData({ ...labelData, weight: e.target.value })
                }
                placeholder="Package weight"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="trackingUrl">Tracking URL</Label>
            <Input
              id="trackingUrl"
              value={labelData.trackingUrl}
              onChange={(e) => 
                setLabelData({ ...labelData, trackingUrl: e.target.value })
              }
              placeholder="https://tracking.carrier.com/..."
            />
          </div>

          <div>
            <Label>Package Dimensions (cm)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="Length"
                value={labelData.dimensions.length}
                onChange={(e) => 
                  setLabelData({ 
                    ...labelData, 
                    dimensions: { ...labelData.dimensions, length: e.target.value }
                  })
                }
              />
              <Input
                type="number"
                placeholder="Width"
                value={labelData.dimensions.width}
                onChange={(e) => 
                  setLabelData({ 
                    ...labelData, 
                    dimensions: { ...labelData.dimensions, width: e.target.value }
                  })
                }
              />
              <Input
                type="number"
                placeholder="Height"
                value={labelData.dimensions.height}
                onChange={(e) => 
                  setLabelData({ 
                    ...labelData, 
                    dimensions: { ...labelData.dimensions, height: e.target.value }
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="packageType">Package Type</Label>
            <Select
              value={labelData.packageType}
              onValueChange={(value) => 
                setLabelData({ ...labelData, packageType: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="box">Box</SelectItem>
                <SelectItem value="envelope">Envelope</SelectItem>
                <SelectItem value="tube">Tube</SelectItem>
                <SelectItem value="pallet">Pallet</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={labelData.notes}
              onChange={(e) => 
                setLabelData({ ...labelData, notes: e.target.value })
              }
              placeholder="Special instructions or notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateLabel}
            disabled={loading || !labelData.carrier || !labelData.service}
          >
            {loading ? 'Generating...' : 'Generate Label'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </>
  )
}