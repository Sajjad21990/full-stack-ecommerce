import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getInventoryLevels, getInventoryLocations, getInventoryStats } from '@/lib/admin/queries/inventory'
import { InventoryTable } from '@/components/admin/inventory/inventory-table'
import { InventoryFilters } from '@/components/admin/inventory/inventory-filters'
import { formatPrice, formatCompactNumber } from '@/lib/utils'
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  DollarSign 
} from 'lucide-react'

interface InventoryPageProps {
  searchParams: {
    search?: string
    locationId?: string
    lowStock?: string
    outOfStock?: string
    page?: string
    limit?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
}

export default function InventoryPage({ searchParams }: InventoryPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage stock levels and track inventory across all locations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<InventoryStatsSkeleton />}>
        <InventoryStats />
      </Suspense>

      {/* Filters */}
      <Suspense fallback={<div className="h-20" />}>
        <InventoryFiltersWrapper />
      </Suspense>

      {/* Inventory Table */}
      <Suspense fallback={<InventoryTableSkeleton />}>
        <InventoryTableWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function InventoryStats() {
  const stats = await getInventoryStats()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCompactNumber(stats.totalItems)}</div>
          <p className="text-xs text-muted-foreground">
            Across all locations
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
          <p className="text-xs text-muted-foreground">
            Below reorder point
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{stats.outOfStockCount}</div>
          <p className="text-xs text-muted-foreground">
            Zero quantity items
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPrice(stats.totalValue)}</div>
          <p className="text-xs text-muted-foreground">
            At average cost
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

async function InventoryFiltersWrapper() {
  const locations = await getInventoryLocations()
  return <InventoryFilters locations={locations} />
}

async function InventoryTableWrapper({ searchParams }: { searchParams: InventoryPageProps['searchParams'] }) {
  const filters = {
    search: searchParams.search,
    locationId: searchParams.locationId,
    lowStock: searchParams.lowStock === 'true',
    outOfStock: searchParams.outOfStock === 'true',
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '50'),
    sortBy: searchParams.sortBy as any,
    sortOrder: searchParams.sortOrder
  }

  const [{ inventory, pagination }, locations] = await Promise.all([
    getInventoryLevels(filters),
    getInventoryLocations()
  ])

  return (
    <InventoryTable 
      inventory={inventory} 
      locations={locations}
      pagination={pagination}
      currentFilters={filters}
    />
  )
}

function InventoryStatsSkeleton() {
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

function InventoryTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-12 w-20" />
                <Skeleton className="h-12 w-20" />
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}