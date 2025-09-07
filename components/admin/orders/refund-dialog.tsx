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
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CreditCard, AlertCircle, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { processRefund } from '@/lib/admin/actions/orders'
import { formatCurrency } from '@/lib/utils'

interface RefundDialogProps {
  order: any
  trigger?: React.ReactNode
}

const refundReasons = [
  { value: 'duplicate', label: 'Duplicate Order' },
  { value: 'fraudulent', label: 'Fraudulent Transaction' },
  { value: 'requested_by_customer', label: 'Requested by Customer' },
  { value: 'product_not_received', label: 'Product Not Received' },
  { value: 'product_damaged', label: 'Product Damaged' },
  { value: 'wrong_product', label: 'Wrong Product Shipped' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'other', label: 'Other' },
]

export default function RefundDialog({ order, trigger }: RefundDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refundData, setRefundData] = useState({
    amount: order.totalAmount,
    reason: '',
    notes: '',
    notifyCustomer: true,
    restockItems: true,
    items: order.items?.map((item: any) => ({
      ...item,
      selected: true,
      refundQuantity: item.quantity,
      refundAmount: item.total
    })) || []
  })

  const maxRefundAmount = order.totalAmount - (order.totalRefunded || 0)
  const selectedItemsTotal = refundData.items
    .filter((item: any) => item.selected)
    .reduce((sum: number, item: any) => sum + item.refundAmount, 0)

  const handleItemToggle = (itemId: string) => {
    setRefundData({
      ...refundData,
      items: refundData.items.map((item: any) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    })
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setRefundData({
      ...refundData,
      items: refundData.items.map((item: any) =>
        item.id === itemId
          ? {
              ...item,
              refundQuantity: quantity,
              refundAmount: Math.floor((item.price * quantity))
            }
          : item
      )
    })
  }

  const handleProcessRefund = async () => {
    if (!refundData.reason) {
      toast.error('Please select a refund reason')
      return
    }

    if (refundData.amount <= 0) {
      toast.error('Refund amount must be greater than 0')
      return
    }

    if (refundData.amount > maxRefundAmount) {
      toast.error(`Refund amount cannot exceed ${formatCurrency(maxRefundAmount)}`)
      return
    }

    setLoading(true)
    try {
      const result = await processRefund({
        orderId: order.id,
        paymentId: order.payments?.[0]?.id,
        amount: refundData.amount,
        reason: refundData.reason,
        notes: refundData.notes,
        notifyCustomer: refundData.notifyCustomer,
        restockItems: refundData.restockItems,
        items: refundData.items
          .filter((item: any) => item.selected)
          .map((item: any) => ({
            orderItemId: item.id,
            quantity: item.refundQuantity,
            amount: item.refundAmount
          }))
      })

      if (result.success) {
        toast.success('Refund processed successfully')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to process refund')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      toast.error('An error occurred while processing the refund')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Process Refund
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Refund for order #{order.orderNumber} - {order.customer?.name || order.email}
          </DialogDescription>
        </DialogHeader>

        {order.totalRefunded > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This order has already been partially refunded. 
              Previous refunds: {formatCurrency(order.totalRefunded)}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          {/* Items Selection */}
          {order.items && order.items.length > 0 && (
            <div>
              <Label>Select Items to Refund</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {refundData.items.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-2 hover:bg-muted/50 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => handleItemToggle(item.id)}
                      />
                      <div>
                        <p className="font-medium text-sm">{item.productTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.variantTitle} - SKU: {item.sku}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        max={item.quantity}
                        value={item.refundQuantity}
                        onChange={(e) => 
                          handleQuantityChange(item.id, parseInt(e.target.value) || 0)
                        }
                        disabled={!item.selected}
                        className="w-16 h-8"
                      />
                      <span className="text-sm text-muted-foreground">
                        / {item.quantity}
                      </span>
                      <span className="text-sm font-medium min-w-[80px] text-right">
                        {formatCurrency(item.refundAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refund Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Refund Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxRefundAmount}
                  value={refundData.amount / 100}
                  onChange={(e) => 
                    setRefundData({ 
                      ...refundData, 
                      amount: Math.floor(parseFloat(e.target.value) * 100) 
                    })
                  }
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum refundable: {formatCurrency(maxRefundAmount)}
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Refund Reason</Label>
              <Select
                value={refundData.reason}
                onValueChange={(value) => 
                  setRefundData({ ...refundData, reason: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {refundReasons.map(reason => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={refundData.notes}
              onChange={(e) => 
                setRefundData({ ...refundData, notes: e.target.value })
              }
              placeholder="Add any internal notes about this refund..."
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify"
                checked={refundData.notifyCustomer}
                onCheckedChange={(checked) => 
                  setRefundData({ ...refundData, notifyCustomer: !!checked })
                }
              />
              <Label 
                htmlFor="notify" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Send refund confirmation email to customer
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="restock"
                checked={refundData.restockItems}
                onCheckedChange={(checked) => 
                  setRefundData({ ...refundData, restockItems: !!checked })
                }
              />
              <Label 
                htmlFor="restock" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Restock returned items to inventory
              </Label>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Original Order Total:</span>
                <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
              </div>
              {order.totalRefunded > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Previously Refunded:</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(order.totalRefunded)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Selected Items Total:</span>
                <span className="font-medium">{formatCurrency(selectedItemsTotal)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-medium">Refund Amount:</span>
                <span className="font-bold text-lg text-red-600">
                  -{formatCurrency(refundData.amount)}
                </span>
              </div>
            </div>
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
            variant="destructive"
            onClick={handleProcessRefund}
            disabled={loading || !refundData.reason || refundData.amount <= 0}
          >
            {loading ? 'Processing...' : `Process Refund of ${formatCurrency(refundData.amount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}