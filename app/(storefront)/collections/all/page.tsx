import { getProductsWithFilters } from '@/lib/storefront/queries/products'
import { ProductGrid } from '@/components/storefront/product/product-grid'
import { FilterSidebar } from '@/components/storefront/collection/filter-sidebar'
import { SortDropdown } from '@/components/storefront/collection/sort-dropdown'
import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'

interface AllProductsPageProps {
  searchParams: {
    page?: string
    sort?: string
    minPrice?: string
    maxPrice?: string
    vendor?: string | string[]
    type?: string | string[]
    inStock?: string
  }
}

export const metadata = {
  title: 'All Products | Shop',
  description: 'Browse all products in our store',
}

export default async function AllProductsPage({ searchParams }: AllProductsPageProps) {
  const page = parseInt(searchParams.page || '1')
  const sortBy = searchParams.sort as any
  const vendors = Array.isArray(searchParams.vendor) 
    ? searchParams.vendor 
    : searchParams.vendor 
    ? [searchParams.vendor] 
    : undefined
  const productTypes = Array.isArray(searchParams.type)
    ? searchParams.type
    : searchParams.type
    ? [searchParams.type]
    : undefined

  const filters = {
    sortBy,
    minPrice: searchParams.minPrice ? parseInt(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? parseInt(searchParams.maxPrice) : undefined,
    vendor: vendors,
    productType: productTypes,
    inStock: searchParams.inStock === 'true',
  }

  const { products, pagination } = await getProductsWithFilters(filters, page)

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'All Products' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">All Products</h1>
          <p className="text-gray-600">Browse our entire collection</p>
        </div>
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <FilterSidebar 
              currentFilters={filters}
              products={products}
            />
          </aside>
          
          <main className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-600">
                {pagination?.total || 0} products found
              </p>
              <SortDropdown currentSort={sortBy} />
            </div>
            
            {products.length > 0 ? (
              <>
                <ProductGrid products={products} />
                
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-12 flex justify-center gap-2">
                    {pagination.hasPrev && (
                      <a
                        href={`?page=${page - 1}${sortBy ? `&sort=${sortBy}` : ''}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        Previous
                      </a>
                    )}
                    
                    <span className="px-4 py-2">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    
                    {pagination.hasNext && (
                      <a
                        href={`?page=${page + 1}${sortBy ? `&sort=${sortBy}` : ''}`}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        Next
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}