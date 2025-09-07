import { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchResults } from '@/components/storefront/search/search-results'
import { SearchFilters } from '@/components/storefront/search/search-filters'
import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'

interface SearchPageProps {
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

export function generateMetadata({ searchParams }: SearchPageProps): Metadata {
  const query = searchParams.q || ''
  const title = query ? `Search results for "${query}"` : 'Search Products'
  
  return {
    title,
    description: `Find the best products ${query ? `matching "${query}"` : 'in our store'}. Filter by price, category, brand and more.`,
  }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Search', href: '/search' }
  ]

  if (searchParams.q) {
    breadcrumbs.push({
      label: `Results for "${searchParams.q}"`,
      href: `/search?q=${encodeURIComponent(searchParams.q)}`
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumbs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      {/* Search Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {searchParams.q ? `Search Results` : 'All Products'}
              </h1>
              {searchParams.q && (
                <p className="text-gray-600 mt-1">
                  Showing results for "<span className="font-medium">{searchParams.q}</span>"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="hidden lg:block">
            <Suspense fallback={<div>Loading filters...</div>}>
              <SearchFilters searchParams={searchParams} />
            </Suspense>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <Suspense 
              fallback={
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded-t-lg"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              <SearchResults searchParams={searchParams} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Mobile Filters */}
      <div className="lg:hidden">
        {/* Mobile filter button and modal will be added by SearchFilters component */}
      </div>
    </div>
  )
}