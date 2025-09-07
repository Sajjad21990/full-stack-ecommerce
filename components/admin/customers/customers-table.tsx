'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  Mail,
  UserX,
  UserCheck,
  ShieldOff,
  Shield,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  blockCustomer, 
  unblockCustomer, 
  updateCustomer 
} from '@/lib/admin/actions/customers'

interface CustomersTableProps {
  customers: any[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function CustomersTable({ customers, pagination }: CustomersTableProps) {
  const router = useRouter()
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      blocked: 'bg-red-100 text-red-800'
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {status}
      </Badge>
    )
  }

  const handleQuickAction = async (action: string, customerId: string) => {
    setLoading(customerId)
    
    try {
      let result
      switch (action) {
        case 'block':
          result = await blockCustomer(customerId)
          break
        case 'unblock':
          result = await unblockCustomer(customerId)
          break
        case 'activate':
          result = await updateCustomer({ customerId, status: 'active' })
          break
        case 'deactivate':
          result = await updateCustomer({ customerId, status: 'inactive' })
          break
        case 'verify':
          result = await updateCustomer({ customerId, emailVerified: true })
          break
        case 'unverify':
          result = await updateCustomer({ customerId, emailVerified: false })
          break
        default:
          throw new Error('Unknown action')
      }

      if (result.success) {
        toast.success(`Customer ${action}ed successfully`)
        router.refresh()
      } else {
        toast.error(result.error || `Failed to ${action} customer`)
      }
    } catch (error) {
      console.error('Error performing action:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const selectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(customers.map(customer => customer.id))
    }
  }

  const isSelected = (customerId: string) => selectedCustomers.includes(customerId)

  const toggleSelection = (customerId: string) => {
    if (isSelected(customerId)) {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId))
    } else {
      setSelectedCustomers([...selectedCustomers, customerId])
    }
  }

  const goToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`/admin/customers?${params.toString()}`)
  }

  return (
    <div>
      {selectedCustomers.length > 0 && (
        <div className="bg-muted p-4 rounded-lg mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedCustomers.length} customer(s) selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              Add to Group
            </Button>
            <Button size="sm" variant="outline">
              Send Email
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
                  checked={selectedCustomers.length === customers.length && customers.length > 0}
                  onCheckedChange={selectAll}
                />
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Email Verified</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(customer.id)}
                      onCheckedChange={() => toggleSelection(customer.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gray-100">
                        {customer.image ? (
                          <Image
                            src={customer.image}
                            alt={customer.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 text-sm font-medium">
                            {customer.name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <Link 
                          href={`/admin/customers/${customer.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {customer.name}
                        </Link>
                        <div className="text-sm text-muted-foreground">
                          {customer.email}
                        </div>
                        {customer.phone && (
                          <div className="text-xs text-muted-foreground">
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.emailVerified ? 'default' : 'secondary'}>
                      {customer.emailVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(customer.status)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{customer.orderCount}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(customer.totalSpent)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(new Date(customer.createdAt))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={loading === customer.id}
                        >
                          {loading === customer.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/customers/${customer.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        
                        {customer.status === 'active' ? (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('deactivate', customer.id)}
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('activate', customer.id)}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Activate
                          </DropdownMenuItem>
                        )}

                        {customer.emailVerified ? (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('unverify', customer.id)}
                          >
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Unverify Email
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('verify', customer.id)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Verify Email
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />
                        
                        {customer.status === 'blocked' ? (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('unblock', customer.id)}
                            className="text-green-600"
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Unblock Customer
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleQuickAction('block', customer.id)}
                            className="text-red-600"
                          >
                            <UserX className="mr-2 h-4 w-4" />
                            Block Customer
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
            {pagination.total} customers
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