import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Plus, Users, Shield, UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'
import { getUsers } from '@/lib/admin/queries/users'
import { UsersTable } from '@/components/admin/users/users-table'
import { UsersFilters } from '@/components/admin/users/users-filters'
import { UsersStats } from '@/components/admin/users/users-stats'

interface UsersPageProps {
  searchParams: {
    search?: string
    role?: 'admin' | 'manager' | 'staff' | 'customer'
    status?: 'active' | 'inactive' | 'suspended'
    sortBy?: 'name' | 'email' | 'role' | 'createdAt' | 'lastLoginAt'
    sortOrder?: 'asc' | 'desc'
    page?: string
    limit?: string
  }
}

export default function UsersPage({ searchParams }: UsersPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage admin users, staff members, and customer accounts
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/create">
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<UsersStatsSkeleton />}>
        <UsersStatsWrapper />
      </Suspense>

      {/* Filters */}
      <Suspense fallback={<div className="h-20" />}>
        <UsersFilters />
      </Suspense>

      {/* Users Table */}
      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTableWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function UsersStatsWrapper() {
  const { stats } = await getUsers({ limit: 1 })
  return <UsersStats stats={stats} />
}

async function UsersTableWrapper({ searchParams }: { searchParams: UsersPageProps['searchParams'] }) {
  const filters = {
    search: searchParams.search,
    role: searchParams.role,
    status: searchParams.status,
    sortBy: searchParams.sortBy || 'createdAt',
    sortOrder: searchParams.sortOrder || 'desc',
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '20')
  }

  const { users, pagination } = await getUsers(filters)

  return (
    <UsersTable 
      users={users}
      pagination={pagination}
      currentFilters={filters}
    />
  )
}

function UsersStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}