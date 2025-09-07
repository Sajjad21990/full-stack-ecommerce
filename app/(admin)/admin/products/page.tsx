import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProducts } from '@/lib/admin/queries/products'
import { ProductsTable } from '@/components/admin/products/products-table'
import { ProductsFilters } from '@/components/admin/products/products-filters'
import { ProductsTableSkeleton } from '@/components/admin/products/products-table-skeleton'

interface ProductsPageProps {
  searchParams: {
    search?: string
    status?: 'draft' | 'active' | 'archived'
    page?: string
    limit?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/create">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <ProductsFilters />

      {/* Products Table */}
      <Suspense fallback={<ProductsTableSkeleton />}>
        <ProductsTableWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function ProductsTableWrapper({ searchParams }: { searchParams: ProductsPageProps['searchParams'] }) {
  const filters = {
    search: searchParams.search,
    status: searchParams.status,
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '20'),
    sortBy: searchParams.sortBy as any,
    sortOrder: searchParams.sortOrder
  }

  const { products, pagination } = await getProducts(filters)

  return (
    <ProductsTable 
      products={products} 
      pagination={pagination}
      currentFilters={filters}
    />
  )
}