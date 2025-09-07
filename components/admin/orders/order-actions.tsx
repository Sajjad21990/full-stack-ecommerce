'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  CreditCard,
  RefreshCw,
  Mail,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  updateOrderStatus, 
  fulfillOrder, 
  cancelOrder, 
  refundOrder,
  resendOrderConfirmation 
} from '@/lib/admin/actions/orders'
import { formatCurrency } from '@/lib/utils'

interface OrderActionsProps {
  order: any
}

export default function OrderActions({ order }: OrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [refundAmount, setRefundAmount] = useState(order.totalAmount.toString())
  const [refundReason, setRefundReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [trackingInfo, setTrackingInfo] = useState({
    trackingNumber: order.trackingNumber || '',
    trackingUrl: order.trackingUrl || '',
    carrier: order.carrier || ''
  })

  const handleStatusChange = async (status: string) => {
    setLoading('status')
    
    try {
      const result = await updateOrderStatus({
        orderId: order.id,
        status: status as any,
        note: `Order status updated to ${status}`
      })
      
      if (result.success) {
        toast.success('Order status updated successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleFulfillOrder = async () => {
    setLoading('fulfill')
    
    try {
      const result = await fulfillOrder(order.id)
      
      if (result.success) {
        toast.success('Order fulfilled successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to fulfill order')
      }
    } catch (error) {
      console.error('Error fulfilling order:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleCancelOrder = async () => {
    setLoading('cancel')
    
    try {
      const result = await cancelOrder(order.id, cancelReason)
      
      if (result.success) {
        toast.success('Order cancelled successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to cancel order')
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
      setCancelReason('')
    }
  }

  const handleRefundOrder = async () => {
    setLoading('refund')
    
    try {
      const amount = parseFloat(refundAmount)
      if (isNaN(amount) || amount <= 0) {
        toast.error('Invalid refund amount')
        return
      }

      const result = await refundOrder(order.id, amount, refundReason)
      
      if (result.success) {
        toast.success(`Refunded ${formatCurrency(result.refundAmount || amount)}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to process refund')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
      setRefundReason('')
    }
  }

  const handleUpdateTracking = async () => {
    setLoading('tracking')
    
    try {
      const result = await updateOrderStatus({
        orderId: order.id,
        trackingNumber: trackingInfo.trackingNumber,
        trackingUrl: trackingInfo.trackingUrl,
        carrier: trackingInfo.carrier,
        note: 'Tracking information updated'
      })
      
      if (result.success) {
        toast.success('Tracking information updated')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update tracking')
      }
    } catch (error) {
      console.error('Error updating tracking:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleResendEmail = async () => {
    setLoading('email')
    
    try {
      const result = await resendOrderConfirmation(order.id)
      
      if (result.success) {
        toast.success('Confirmation email sent')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const canFulfill = order.fulfillmentStatus === 'unfulfilled' && 
    order.status !== 'cancelled' && 
    order.status !== 'failed'

  const canCancel = order.status !== 'cancelled' && 
    order.status !== 'delivered' &&
    order.status !== 'failed'

  const canRefund = order.paymentStatus === 'paid' || 
    order.paymentStatus === 'partially_refunded'

  const canShip = (order.status === 'processing' || order.status === 'confirmed') &&
    order.fulfillmentStatus === 'fulfilled'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Order Status</Label>
          <Select 
            value={order.status} 
            onValueChange={handleStatusChange}
            disabled={loading === 'status'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canFulfill && (
          <Button 
            onClick={handleFulfillOrder}
            disabled={loading === 'fulfill'}
            className="w-full"
          >
            {loading === 'fulfill' ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Package className="mr-2 h-4 w-4" />
            )}
            Fulfill Order
          </Button>
        )}

        {canShip && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Truck className="mr-2 h-4 w-4" />
                Add Tracking
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Tracking Information</DialogTitle>
                <DialogDescription>
                  Add shipping carrier and tracking details for this order.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="carrier">Carrier</Label>
                  <Input
                    id="carrier"
                    value={trackingInfo.carrier}
                    onChange={(e) => setTrackingInfo(prev => ({ ...prev, carrier: e.target.value }))}
                    placeholder="e.g., FedEx, UPS, DHL"
                  />
                </div>
                <div>
                  <Label htmlFor="tracking">Tracking Number</Label>
                  <Input
                    id="tracking"
                    value={trackingInfo.trackingNumber}
                    onChange={(e) => setTrackingInfo(prev => ({ ...prev, trackingNumber: e.target.value }))}
                    placeholder="Enter tracking number"
                  />
                </div>
                <div>
                  <Label htmlFor="url">Tracking URL</Label>
                  <Input
                    id="url"
                    value={trackingInfo.trackingUrl}
                    onChange={(e) => setTrackingInfo(prev => ({ ...prev, trackingUrl: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleUpdateTracking}
                  disabled={loading === 'tracking'}
                >
                  {loading === 'tracking' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  Update Tracking
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {canRefund && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <CreditCard className="mr-2 h-4 w-4" />
                Issue Refund
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Issue Refund</DialogTitle>
                <DialogDescription>
                  Process a full or partial refund for this order.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">Refund Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    max={order.totalAmount - (order.refundedAmount || 0)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum: {formatCurrency(order.totalAmount - (order.refundedAmount || 0))}
                  </p>
                </div>
                <div>
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Enter refund reason..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleRefundOrder}
                  disabled={loading === 'refund'}
                  variant="destructive"
                >
                  {loading === 'refund' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  Process Refund
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Button 
          onClick={handleResendEmail}
          disabled={loading === 'email'}
          variant="outline"
          className="w-full"
        >
          {loading === 'email' ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Resend Confirmation
        </Button>

        {canCancel && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Order
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Order</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    This action cannot be undone.
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cancel-reason">Reason (Optional)</Label>
                  <Textarea
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter cancellation reason..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCancelOrder}
                  disabled={loading === 'cancel'}
                  variant="destructive"
                >
                  {loading === 'cancel' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  Cancel Order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}