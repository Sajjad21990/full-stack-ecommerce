'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { MoreHorizontal, Eye, CheckCircle, XCircle, Package } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { approveReturn, rejectReturn, processReturn } from '@/lib/admin/actions/returns'

interface ReturnsTableProps {
  returns: any[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

const statusColors: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  received: 'bg-purple-100 text-purple-800',
  processed: 'bg-green-100 text-green-800'
}

const reasonLabels: Record<string, string> = {
  damaged: 'Damaged',
  wrong_item: 'Wrong Item',
  not_as_described: 'Not as Described',
  quality: 'Quality Issue',
  other: 'Other'
}

export default function ReturnsTable({ returns, pagination }: ReturnsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedReturns, setSelectedReturns] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReturns(returns.map(r => r.return.id))
    } else {
      setSelectedReturns([])
    }
  }

  const handleSelectReturn = (returnId: string, checked: boolean) => {
    if (checked) {
      setSelectedReturns([...selectedReturns, returnId])
    } else {
      setSelectedReturns(selectedReturns.filter(id => id !== returnId))
    }
  }

  const handleApprove = async (returnId: string) => {
    setLoading(returnId)
    try {
      const result = await approveReturn(returnId)
      if (result.success) {
        toast.success('Return approved successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to approve return')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async (returnId: string) => {
    setLoading(returnId)
    try {
      const result = await rejectReturn(returnId, 'Does not meet return policy')
      if (result.success) {
        toast.success('Return rejected')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to reject return')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleProcess = async (returnId: string) => {
    setLoading(returnId)
    try {
      const result = await processReturn(returnId, 'refund')
      if (result.success) {
        toast.success('Return processed successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to process return')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', page.toString())
    return `?${params.toString()}`
  }

  const calculateReturnValue = (items: any[]) => {
    return items.reduce((sum, item) => {
      return sum + (item.orderItem.price * item.quantity)
    }, 0)
  }

  return (
    <div className="space-y-4">
      {selectedReturns.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedReturns.length} return(s) selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Bulk approve
              selectedReturns.forEach(id => handleApprove(id))
            }}
          >
            Approve Selected
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedReturns.length === returns.length && returns.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Return #</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns.map((returnData) => {
              const isLoading = loading === returnData.return.id
              const returnValue = calculateReturnValue(returnData.items || [])

              return (
                <TableRow key={returnData.return.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedReturns.includes(returnData.return.id)}
                      onCheckedChange={(checked) => 
                        handleSelectReturn(returnData.return.id, !!checked)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link 
                      href={`/admin/orders/returns/${returnData.return.id}`}
                      className="hover:underline"
                    >
                      {returnData.return.returnNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/admin/orders/${returnData.order.id}`}
                      className="hover:underline text-primary"
                    >
                      #{returnData.order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {returnData.customer?.name || 'Guest'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {returnData.order.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{returnData.items?.length || 0} item(s)</p>
                      {returnData.items && returnData.items[0] && (
                        <p className="text-muted-foreground">
                          {returnData.items[0].orderItem.productTitle}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {reasonLabels[returnData.return.reason] || returnData.return.reason}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(returnValue)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={statusColors[returnData.return.status]}
                    >
                      {returnData.return.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDate(new Date(returnData.return.createdAt))}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={isLoading}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/orders/returns/${returnData.return.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {returnData.return.status === 'requested' && (
                          <>
                            <DropdownMenuItem 
                              onClick={() => handleApprove(returnData.return.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve Return
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleReject(returnData.return.id)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject Return
                            </DropdownMenuItem>
                          </>
                        )}
                        {returnData.return.status === 'approved' && (
                          <DropdownMenuItem 
                            onClick={() => handleProcess(returnData.return.id)}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Process Return
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
            {returns.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12">
                  <div className="text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No returns found</p>
                    <p className="text-sm mt-1">
                      Returns will appear here when customers request them
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            {pagination.hasPreviousPage && (
              <PaginationItem>
                <PaginationPrevious href={getPageUrl(pagination.page - 1)} />
              </PaginationItem>
            )}
            
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const page = i + 1
              return (
                <PaginationItem key={page}>
                  <PaginationLink 
                    href={getPageUrl(page)}
                    isActive={page === pagination.page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              )
            })}

            {pagination.totalPages > 5 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}

            {pagination.hasNextPage && (
              <PaginationItem>
                <PaginationNext href={getPageUrl(pagination.page + 1)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}