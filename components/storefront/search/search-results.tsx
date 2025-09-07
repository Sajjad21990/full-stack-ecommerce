import { ProductCard } from '@/components/storefront/product/product-card'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/storefront/utils'
import { Package, Search, ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface SearchResultsProps {
  searchParams: {
    q?: string
    category?: string[]
    minPrice?: string
    maxPrice?: string
    brand?: string[]
    inStock?: string
    sortBy?: string
    page?: string
  }
}

// Mock function to fetch search results - replace with actual API call
async function fetchSearchResults(searchParams: SearchResultsProps['searchParams']) {
  const params = new URLSearchParams()
  
  if (searchParams.q) params.set('q', searchParams.q)
  if (searchParams.minPrice) params.set('minPrice', searchParams.minPrice)
  if (searchParams.maxPrice) params.set('maxPrice', searchParams.maxPrice)
  if (searchParams.inStock) params.set('inStock', searchParams.inStock)
  if (searchParams.sortBy) params.set('sortBy', searchParams.sortBy)
  if (searchParams.page) params.set('page', searchParams.page)
  
  // Add array params
  if (searchParams.category) {
    (Array.isArray(searchParams.category) ? searchParams.category : [searchParams.category]).forEach(cat => {
      params.append('category', cat)
    })
  }
  if (searchParams.brand) {
    (Array.isArray(searchParams.brand) ? searchParams.brand : [searchParams.brand]).forEach(brand => {
      params.append('brand', brand)
    })
  }

  try {
    // In a real app, this would be a fetch to your API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/search?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch search results')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error fetching search results:', error)
    return { products: [], pagination: null }
  }
}

export async function SearchResults({ searchParams }: SearchResultsProps) {
  const { products, pagination } = await fetchSearchResults(searchParams)
  
  const currentPage = parseInt(searchParams.page || '1')
  const hasQuery = searchParams.q && searchParams.q.trim().length > 0
  
  // Build pagination URL helper
  const getPaginationUrl = (page: number) => {
    const params = new URLSearchParams()
    if (searchParams.q) params.set('q', searchParams.q)
    if (searchParams.minPrice) params.set('minPrice', searchParams.minPrice)
    if (searchParams.maxPrice) params.set('maxPrice', searchParams.maxPrice)
    if (searchParams.inStock) params.set('inStock', searchParams.inStock)
    if (searchParams.sortBy) params.set('sortBy', searchParams.sortBy)
    
    if (searchParams.category) {
      (Array.isArray(searchParams.category) ? searchParams.category : [searchParams.category]).forEach(cat => {
        params.append('category', cat)
      })
    }
    if (searchParams.brand) {
      (Array.isArray(searchParams.brand) ? searchParams.brand : [searchParams.brand]).forEach(brand => {
        params.append('brand', brand)
      })
    }
    
    params.set('page', page.toString())
    return `/search?${params.toString()}`
  }

  // No results
  if (!products || products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="max-w-md mx-auto">
          {hasQuery ? (
            <>
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No results found
              </h3>
              <p className="text-gray-600 mb-6">
                We couldn't find any products matching "{searchParams.q}". 
                Try adjusting your search terms or filters.
              </p>
            </>
          ) : (
            <>
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-600 mb-6">
                No products match your current filter criteria. 
                Try adjusting your filters to see more results.
              </p>
            </>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/search">Clear all filters</Link>
            </Button>
            <Button asChild>
              <Link href="/products">Browse all products</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">
              {pagination ? (
                <>
                  Showing {((currentPage - 1) * pagination.limit) + 1} - {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} products
                </>
              ) : (
                `Showing ${products.length} products`
              )}
            </p>
            {hasQuery && (
              <p className="text-xs text-gray-500 mt-1">
                Search results for "<span className="font-medium">{searchParams.q}</span>"
              </p>
            )}
          </div>
          
          {/* Mobile Sort - shown on smaller screens */}
          <div className="sm:hidden">
            <select
              value={searchParams.sortBy || 'relevance'}
              onChange={(e) => {
                const params = new URLSearchParams(window.location.search)
                if (e.target.value !== 'relevance') {
                  params.set('sortBy', e.target.value)
                } else {
                  params.delete('sortBy')
                }
                params.delete('page')
                window.location.search = params.toString()
              }}
              className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="relevance">Most Relevant</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title-asc">Name: A to Z</option>
              <option value="title-desc">Name: Z to A</option>
              <option value="created-desc">Newest First</option>
              <option value="created-asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product: any) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              {pagination.hasPrev && (
                <Button 
                  asChild 
                  variant="outline" 
                  size="sm"
                >
                  <Link href={getPaginationUrl(pagination.page - 1)}>
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Link>
                </Button>
              )}
              
              {/* Page Numbers */}
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
                  
                  const isCurrentPage = pageNum === pagination.page
                  
                  return (
                    <Button
                      key={pageNum}
                      asChild
                      variant={isCurrentPage ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                    >
                      <Link href={getPaginationUrl(pageNum)}>
                        {pageNum}
                      </Link>
                    </Button>
                  )
                })}
              </div>
              
              {pagination.hasNext && (
                <Button 
                  asChild 
                  variant="outline" 
                  size="sm"
                >
                  <Link href={getPaginationUrl(pagination.page + 1)}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}