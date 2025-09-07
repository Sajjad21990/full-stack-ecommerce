'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MoreHorizontal, 
  Eye, 
  Package, 
  Truck,
  CreditCard,
  X,
  RefreshCw,
  Mail,
  Copy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { updateOrderStatus, fulfillOrder, cancelOrder } from '@/lib/admin/actions/orders'

interface OrdersTableProps {
  orders: any[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function OrdersTable({ orders, pagination }: OrdersTableProps) {
  const router = useRouter()
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      confirmed: 'default',
      processing: 'default',
      shipped: 'default',
      delivered: 'outline',
      cancelled: 'destructive',
      failed: 'destructive'
    }

    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800'
    }

    return (
      <Badge variant={variants[status] || 'secondary'} className={colors[status]}>
        {status}
      </Badge>
    )
  }

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      partially_paid: 'bg-orange-100 text-orange-800',
      refunded: 'bg-gray-100 text-gray-800',
      partially_refunded: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800',
      authorized: 'bg-blue-100 text-blue-800'
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getFulfillmentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      unfulfilled: 'bg-gray-100 text-gray-800',
      partially_fulfilled: 'bg-orange-100 text-orange-800',
      fulfilled: 'bg-green-100 text-green-800',
      returned: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const handleQuickAction = async (action: string, orderId: string) => {
    setLoading(orderId)
    
    try {
      let result
      switch (action) {
        case 'fulfill':
          result = await fulfillOrder(orderId)
          break
        case 'cancel':
          result = await cancelOrder(orderId)
          break
        case 'processing':
          result = await updateOrderStatus({ 
            orderId, 
            status: 'processing',
            note: 'Order marked as processing'
          })
          break
        case 'shipped':
          result = await updateOrderStatus({ 
            orderId, 
            status: 'shipped',
            note: 'Order marked as shipped'
          })
          break
        default:
          throw new Error('Unknown action')
      }

      if (result.success) {
        toast.success(`Order ${action} successfully`)
        router.refresh()
      } else {
        toast.error(result.error || `Failed to ${action} order`)
      }
    } catch (error) {
      console.error('Error performing action:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const copyOrderNumber = (orderNumber: string) => {
    navigator.clipboard.writeText(orderNumber)
    toast.success('Order number copied to clipboard')
  }

  const selectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(orders.map(order => order.id))
    }
  }

  const isSelected = (orderId: string) => selectedOrders.includes(orderId)

  const toggleSelection = (orderId: string) => {
    if (isSelected(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId))
    } else {
      setSelectedOrders([...selectedOrders, orderId])
    }
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`/admin/orders?${params.toString()}`)
  }

  return (
    <div>
      {selectedOrders.length > 0 && (
        <div className="bg-muted p-4 rounded-lg mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedOrders.length} order(s) selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              Bulk Update Status
            </Button>
            <Button size="sm" variant="outline">
              Export Selected
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedOrders.length === orders.length && orders.length > 0}
                  onCheckedChange={selectAll}
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(order.id)}
                      onCheckedChange={() => toggleSelection(order.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Link 
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        #{order.orderNumber}
                      </Link>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {order.items?.length || 0} item(s)
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => copyOrderNumber(order.orderNumber)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {order.customer?.name || order.shippingAddress?.firstName + ' ' + order.shippingAddress?.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {order.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">
                        {formatDate(new Date(order.createdAt))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(order.paymentStatus)}
                  </TableCell>
                  <TableCell>
                    {getFulfillmentStatusBadge(order.fulfillmentStatus)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(order.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={loading === order.id}
                        >
                          {loading === order.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/orders/${order.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {order.status === 'pending' && (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('processing', order.id)}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Mark as Processing
                          </DropdownMenuItem>
                        )}
                        {order.fulfillmentStatus === 'unfulfilled' && (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('fulfill', order.id)}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Fulfill Order
                          </DropdownMenuItem>
                        )}
                        {(order.status === 'processing' || order.status === 'confirmed') && (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('shipped', order.id)}
                          >
                            <Truck className="mr-2 h-4 w-4" />
                            Mark as Shipped
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {order.paymentStatus === 'paid' && (
                          <DropdownMenuItem>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Issue Refund
                          </DropdownMenuItem>
                        )}
                        {order.status !== 'cancelled' && order.status !== 'delivered' && (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('cancel', order.id)}
                            className="text-red-600"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Cancel Order
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} orders
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}