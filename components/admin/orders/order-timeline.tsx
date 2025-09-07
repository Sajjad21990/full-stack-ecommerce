'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { 
  Package, 
  CreditCard, 
  Truck, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  RefreshCw
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import { addOrderNote } from '@/lib/admin/actions/orders'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface OrderTimelineProps {
  orderId: string
  history: any[]
}

export default function OrderTimeline({ orderId, history }: OrderTimelineProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [isInternal, setIsInternal] = useState(true)
  const [loading, setLoading] = useState(false)

  const getTimelineIcon = (fromStatus: string, toStatus: string) => {
    if (fromStatus === 'note' && toStatus === 'note') {
      return MessageSquare
    }
    
    if (toStatus.includes('payment_')) {
      return CreditCard
    }
    
    if (toStatus.includes('fulfillment_')) {
      return Package
    }
    
    const icons: Record<string, any> = {
      pending: Clock,
      confirmed: CheckCircle,
      processing: Package,
      shipped: Truck,
      delivered: CheckCircle,
      cancelled: XCircle,
      failed: AlertCircle
    }
    
    return icons[toStatus] || Clock
  }

  const getTimelineColor = (toStatus: string) => {
    if (toStatus === 'cancelled' || toStatus === 'failed') {
      return 'text-red-600 bg-red-100'
    }
    if (toStatus === 'delivered' || toStatus === 'fulfilled') {
      return 'text-green-600 bg-green-100'
    }
    if (toStatus.includes('payment_paid')) {
      return 'text-green-600 bg-green-100'
    }
    if (toStatus.includes('refund')) {
      return 'text-orange-600 bg-orange-100'
    }
    return 'text-blue-600 bg-blue-100'
  }

  const formatStatusChange = (fromStatus: string, toStatus: string) => {
    if (fromStatus === 'note' && toStatus === 'note') {
      return 'Note added'
    }
    
    const cleanFrom = fromStatus.replace('payment_', '').replace('fulfillment_', '').replace('_', ' ')
    const cleanTo = toStatus.replace('payment_', '').replace('fulfillment_', '').replace('_', ' ')
    
    if (fromStatus.includes('payment_')) {
      return `Payment status changed from ${cleanFrom} to ${cleanTo}`
    }
    
    if (fromStatus.includes('fulfillment_')) {
      return `Fulfillment status changed from ${cleanFrom} to ${cleanTo}`
    }
    
    return `Order status changed from ${cleanFrom} to ${cleanTo}`
  }

  const handleAddNote = async () => {
    if (!note.trim()) {
      toast.error('Please enter a note')
      return
    }

    setLoading(true)
    
    try {
      const result = await addOrderNote(orderId, note, isInternal)
      
      if (result.success) {
        toast.success('Note added successfully')
        setNote('')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to add note')
      }
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Add Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this order..."
              rows={3}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="internal"
                checked={isInternal}
                onCheckedChange={setIsInternal}
              />
              <Label htmlFor="internal">Internal note (not visible to customer)</Label>
            </div>
            <Button 
              onClick={handleAddNote}
              disabled={loading || !note.trim()}
            >
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Add Note
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {history.length === 0 ? (
              <p className="text-muted-foreground">No history available</p>
            ) : (
              history.map((event, index) => {
                const Icon = getTimelineIcon(event.fromStatus, event.toStatus)
                const colorClass = getTimelineColor(event.toStatus)
                
                return (
                  <div key={index} className="flex gap-4">
                    <div className="relative">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {index < history.length - 1 && (
                        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-medium">
                        {formatStatusChange(event.fromStatus, event.toStatus)}
                      </p>
                      {event.note && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.note}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>{event.changedByEmail}</span>
                        <span>•</span>
                        <span>{formatDate(new Date(event.createdAt))}</span>
                        <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                        {event.isInternal && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">Internal</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

import { Badge } from '@/components/ui/badge'