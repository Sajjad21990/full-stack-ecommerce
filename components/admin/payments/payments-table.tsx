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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  MoreHorizontal, 
  Eye, 
  RefreshCw,
  DollarSign,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  processRefund, 
  capturePayment, 
  voidPayment,
  retryFailedPayment
} from '@/lib/admin/actions/payments'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface PaymentsTableProps {
  payments: any[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function PaymentsTable({ payments, pagination }: PaymentsTableProps) {
  const router = useRouter()
  const [selectedPayments, setSelectedPayments] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [refundData, setRefundData] = useState({ amount: '', reason: '' })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      captured: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      authorized: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      refunded: { color: 'bg-gray-100 text-gray-800', icon: RefreshCw },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle }
    }

    const { color, icon: Icon } = config[status] || config.pending
    
    return (
      <Badge variant="outline" className={`${color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const handleQuickAction = async (action: string, paymentId: string, payment?: any) => {
    setLoading(paymentId)
    
    try {
      let result
      switch (action) {
        case 'capture':
          result = await capturePayment(paymentId)
          break
        case 'void':
          result = await voidPayment(paymentId)
          break
        case 'retry':
          result = await retryFailedPayment(paymentId)
          break
        case 'refund':
          result = await processRefund({
            paymentId,
            amount: refundData.amount ? parseFloat(refundData.amount) : undefined,
            reason: refundData.reason || undefined
          })
          break
        default:
          throw new Error('Unknown action')
      }

      if (result.success) {
        toast.success(`Payment ${action} completed successfully`)
        router.refresh()
        setRefundData({ amount: '', reason: '' })
      } else {
        toast.error(result.error || `Failed to ${action} payment`)
      }
    } catch (error) {
      console.error(`Error ${action} payment:`, error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const copyTransactionId = (transactionId: string) => {
    navigator.clipboard.writeText(transactionId)
    toast.success('Transaction ID copied to clipboard')
  }

  const selectAll = () => {
    if (selectedPayments.length === payments.length) {
      setSelectedPayments([])
    } else {
      setSelectedPayments(payments.map(payment => payment.id))
    }
  }

  const isSelected = (paymentId: string) => selectedPayments.includes(paymentId)

  const toggleSelection = (paymentId: string) => {
    if (isSelected(paymentId)) {
      setSelectedPayments(selectedPayments.filter(id => id !== paymentId))
    } else {
      setSelectedPayments([...selectedPayments, paymentId])
    }
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`/admin/payments?${params.toString()}`)
  }

  return (
    <div>
      {selectedPayments.length > 0 && (
        <div className="bg-muted p-4 rounded-lg mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedPayments.length} payment(s) selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              Bulk Refund
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
                  checked={selectedPayments.length === payments.length && payments.length > 0}
                  onCheckedChange={selectAll}
                />
              </TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(payment.id)}
                      onCheckedChange={() => toggleSelection(payment.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium font-mono text-sm">
                          {payment.gatewayTransactionId || payment.id.slice(0, 8)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0"
                          onClick={() => copyTransactionId(payment.gatewayTransactionId || payment.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {payment.paymentMethod || 'Unknown'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment.orderNumber ? (
                      <Link 
                        href={`/admin/orders/${payment.orderId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        #{payment.orderNumber}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">No order</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.customerEmail ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{payment.customerName}</span>
                        <span className="text-sm text-muted-foreground">{payment.customerEmail}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Guest</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className={`font-medium ${payment.amount < 0 ? 'text-red-600' : ''}`}>
                        {payment.amount < 0 ? '-' : ''}{formatCurrency(Math.abs(payment.amount))}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">
                        {payment.currency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium capitalize">{payment.gateway}</span>
                      {payment.failureMessage && (
                        <span className="text-xs text-red-600" title={payment.failureMessage}>
                          {payment.failureMessage.length > 30 
                            ? payment.failureMessage.substring(0, 30) + '...'
                            : payment.failureMessage
                          }
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">
                        {formatDate(new Date(payment.createdAt))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={loading === payment.id}
                        >
                          {loading === payment.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        
                        {payment.status === 'authorized' && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => handleQuickAction('capture', payment.id)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Capture Payment
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleQuickAction('void', payment.id)}
                              className="text-red-600"
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Void Payment
                            </DropdownMenuItem>
                          </>
                        )}

                        {payment.status === 'captured' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Process Refund
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Process Refund</DialogTitle>
                                <DialogDescription>
                                  Process a full or partial refund for this payment.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="amount">Refund Amount</Label>
                                  <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    value={refundData.amount}
                                    onChange={(e) => setRefundData(prev => ({ ...prev, amount: e.target.value }))}
                                    placeholder={`Max: ${formatCurrency(payment.amount)}`}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="reason">Reason (Optional)</Label>
                                  <Textarea
                                    id="reason"
                                    value={refundData.reason}
                                    onChange={(e) => setRefundData(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Enter refund reason..."
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button 
                                  onClick={() => handleQuickAction('refund', payment.id, payment)}
                                  disabled={loading === payment.id}
                                  variant="destructive"
                                >
                                  {loading === payment.id && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                                  Process Refund
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        {payment.status === 'failed' && (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('retry', payment.id)}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry Payment
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
            {pagination.total} payments
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