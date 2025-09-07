import { Metadata } from 'next'
import { getAllCollections } from '@/lib/storefront/queries/products'
import { CollectionCard } from '@/components/storefront/collection/collection-card'
import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'
import { CollectionsSortDropdown } from '@/components/storefront/collection/collections-sort-dropdown'
import { Search, Grid3X3 } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Collections | Shop All Categories',
  description: 'Browse our curated collections featuring the latest trends and timeless classics. Find the perfect products organized by style, occasion, and season.',
}

interface CollectionsPageProps {
  searchParams: {
    search?: string
    sort?: 'title-asc' | 'title-desc' | 'created-desc' | 'created-asc'
  }
}

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const allCollections = await getAllCollections()
  
  // Filter collections based on search
  let filteredCollections = allCollections
  if (searchParams.search) {
    const searchTerm = searchParams.search.toLowerCase()
    filteredCollections = allCollections.filter(collection => 
      collection.title.toLowerCase().includes(searchTerm) ||
      collection.description?.toLowerCase().includes(searchTerm)
    )
  }

  // Sort collections
  const sortBy = searchParams.sort || 'title-asc'
  filteredCollections.sort((a, b) => {
    switch (sortBy) {
      case 'title-desc':
        return b.title.localeCompare(a.title)
      case 'created-desc':
        return new Date(b.id).getTime() - new Date(a.id).getTime() // Using ID as proxy for creation date
      case 'created-asc':
        return new Date(a.id).getTime() - new Date(b.id).getTime()
      default: // title-asc
        return a.title.localeCompare(b.title)
    }
  })

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Collections' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs items={breadcrumbs} className="mb-6" />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Shop Collections
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our carefully curated collections featuring the latest trends, 
              seasonal favorites, and timeless classics.
            </p>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between max-w-4xl mx-auto">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <form method="GET">
                <input
                  type="text"
                  name="search"
                  placeholder="Search collections..."
                  defaultValue={searchParams.search}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
                {searchParams.sort && (
                  <input type="hidden" name="sort" value={searchParams.sort} />
                )}
              </form>
            </div>

            {/* Sort Dropdown */}
            <CollectionsSortDropdown currentSort={sortBy} />

            {/* View Toggle (future enhancement) */}
            <div className="flex items-center border border-gray-300 rounded-md">
              <button className="p-2 bg-gray-100 text-gray-900 rounded-l-md">
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-r-md">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collections Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Results Info */}
        {searchParams.search && (
          <div className="mb-8">
            <p className="text-gray-600">
              {filteredCollections.length} collection{filteredCollections.length !== 1 ? 's' : ''} found for "{searchParams.search}"
            </p>
          </div>
        )}

        {filteredCollections.length > 0 ? (
          <>
            {/* Featured Collections */}
            {!searchParams.search && filteredCollections.length >= 2 && (
              <div className="mb-16">
                <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Featured Collections</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {filteredCollections.slice(0, 2).map((collection) => (
                    <CollectionCard 
                      key={collection.id} 
                      collection={collection} 
                      featured={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Collections Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchParams.search ? filteredCollections : filteredCollections.slice(2)).map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {searchParams.search ? 'No collections found' : 'No collections available'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchParams.search 
                  ? `We couldn't find any collections matching "${searchParams.search}". Try a different search term.`
                  : 'Collections are being curated. Check back soon for our latest offerings.'
                }
              </p>
              {searchParams.search && (
                <Link
                  href="/collections"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 transition-colors"
                >
                  View All Collections
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}