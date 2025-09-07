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
import { Switch } from '@/components/ui/switch'
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
import { 
  MoreHorizontal, 
  Copy, 
  Edit, 
  Trash, 
  Calendar,
  Percent,
  DollarSign,
  Truck,
  Gift
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { toggleDiscountStatus, deleteDiscount, duplicateDiscount } from '@/lib/admin/actions/discounts'

interface DiscountsTableProps {
  discounts: any[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

const typeIcons = {
  percentage: Percent,
  fixed_amount: DollarSign,
  free_shipping: Truck,
  buy_x_get_y: Gift
}

const statusColors = {
  active: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  expired: 'bg-gray-100 text-gray-800',
  disabled: 'bg-red-100 text-red-800',
  draft: 'bg-yellow-100 text-yellow-800'
}

export default function DiscountsTable({ discounts, pagination }: DiscountsTableProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleToggleStatus = async (discountId: string) => {
    setLoading(discountId)
    try {
      const result = await toggleDiscountStatus(discountId)
      if (result.success) {
        toast.success(`Discount ${result.status === 'active' ? 'activated' : 'disabled'}`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update discount')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return
    
    setLoading(discountId)
    try {
      const result = await deleteDiscount(discountId)
      if (result.success) {
        toast.success('Discount deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete discount')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleDuplicate = async (discountId: string) => {
    setLoading(discountId)
    try {
      const result = await duplicateDiscount(discountId)
      if (result.success) {
        toast.success('Discount duplicated successfully')
        router.push(`/admin/discounts/${result.discountId}/edit`)
      } else {
        toast.error(result.error || 'Failed to duplicate discount')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Discount code copied to clipboard')
  }

  const getDiscountValue = (discount: any) => {
    if (discount.discount.type === 'percentage') {
      return `${discount.discount.value / 100}%`
    } else if (discount.discount.type === 'fixed_amount') {
      return formatCurrency(discount.discount.value)
    } else if (discount.discount.type === 'free_shipping') {
      return 'Free Shipping'
    } else if (discount.discount.type === 'buy_x_get_y') {
      return `Buy ${discount.discount.prerequisiteQuantity} Get ${discount.discount.entitledQuantity}`
    }
    return '-'
  }

  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    return `?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.map((item) => {
              const TypeIcon = typeIcons[item.discount.type as keyof typeof typeIcons]
              const isLoading = loading === item.discount.id
              
              return (
                <TableRow key={item.discount.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-medium">
                        {item.discount.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(item.discount.code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/admin/discounts/${item.discount.id}`}
                      className="hover:underline font-medium"
                    >
                      {item.discount.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm capitalize">
                        {item.discount.type.replace('_', ' ')}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getDiscountValue(item)}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{Number(item.usageCount)} uses</p>
                      {item.discount.usageLimit && (
                        <p className="text-muted-foreground">
                          of {item.discount.usageLimit}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={statusColors[item.discount.status as keyof typeof statusColors]}
                    >
                      {item.discount.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.discount.startsAt && (
                        <p>Starts: {formatDate(new Date(item.discount.startsAt))}</p>
                      )}
                      {item.discount.endsAt && (
                        <p className="text-muted-foreground">
                          Ends: {formatDate(new Date(item.discount.endsAt))}
                        </p>
                      )}
                      {!item.discount.startsAt && !item.discount.endsAt && (
                        <span className="text-muted-foreground">No schedule</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.discount.status === 'active'}
                      onCheckedChange={() => handleToggleStatus(item.discount.id)}
                      disabled={isLoading || item.discount.status === 'expired'}
                    />
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
                          <Link href={`/admin/discounts/${item.discount.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(item.discount.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/discounts/${item.discount.id}/schedule`}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(item.discount.id)}
                          className="text-destructive"
                        >
                          <Trash className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
            {discounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No discounts found</p>
                    <p className="text-sm mt-1">
                      Create your first discount to get started
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