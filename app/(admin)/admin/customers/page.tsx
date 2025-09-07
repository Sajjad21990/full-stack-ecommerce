import { Suspense } from 'react'
import { getCustomers, getCachedCustomerStats, getCustomerGroups } from '@/lib/admin/queries/customers'
import CustomersTable from '@/components/admin/customers/customers-table'
import CustomerStats from '@/components/admin/customers/customer-stats'
import CustomerFilters from '@/components/admin/customers/customer-filters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Download, Mail, Users } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: {
    page?: string
    search?: string
    status?: string
    emailVerified?: string
    dateFrom?: string
    dateTo?: string
    sortBy?: string
    sortOrder?: string
    groupId?: string
    hasOrders?: string
  }
}

export default async function CustomersPage({ searchParams }: PageProps) {
  const filters = {
    page: searchParams.page ? parseInt(searchParams.page) : 1,
    search: searchParams.search,
    status: searchParams.status as any,
    emailVerified: searchParams.emailVerified === 'true' ? true : searchParams.emailVerified === 'false' ? false : undefined,
    dateFrom: searchParams.dateFrom ? new Date(searchParams.dateFrom) : undefined,
    dateTo: searchParams.dateTo ? new Date(searchParams.dateTo) : undefined,
    sortBy: searchParams.sortBy as any,
    sortOrder: searchParams.sortOrder as any,
    groupId: searchParams.groupId,
    hasOrders: searchParams.hasOrders === 'true' ? true : searchParams.hasOrders === 'false' ? false : undefined
  }

  const [customersData, stats, groups] = await Promise.all([
    getCustomers(filters),
    getCachedCustomerStats(),
    getCustomerGroups()
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage and analyze your customer base
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Bulk Email
          </Button>
          <Link href="/admin/customers/groups">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Groups
            </Button>
          </Link>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <CustomerStats stats={stats} />
      </Suspense>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading filters...</div>}>
            <CustomerFilters filters={filters} groups={groups} />
          </Suspense>
          
          <Suspense fallback={<div>Loading customers...</div>}>
            <CustomersTable 
              customers={customersData.customers} 
              pagination={customersData.pagination}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}