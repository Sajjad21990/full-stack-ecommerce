import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Collection {
  id: string
  title: string
  handle: string
  description?: string
  image?: string
  productCount?: number
}

interface CollectionCardProps {
  collection: Collection
  featured?: boolean
  className?: string
}

export function CollectionCard({ collection, featured = false, className }: CollectionCardProps) {
  return (
    <Link
      href={`/collections/${collection.handle}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl bg-white shadow-sm hover:shadow-lg transition-all duration-300",
        featured ? "aspect-[3/2]" : "aspect-[4/3]",
        className
      )}
    >
      {/* Collection Image */}
      <div className="relative w-full h-full overflow-hidden">
        {collection.image ? (
          <Image
            src={collection.image}
            alt={collection.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center">
            <Package className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h3 className={cn(
              "font-bold text-white mb-2 group-hover:text-gray-100 transition-colors",
              featured ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
            )}>
              {collection.title}
            </h3>
            
            {collection.description && (
              <p className={cn(
                "text-gray-200 line-clamp-2 mb-3",
                featured ? "text-base" : "text-sm"
              )}>
                {collection.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-300">
              {collection.productCount !== undefined && (
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {collection.productCount} products
                </span>
              )}
              
              <span className="flex items-center gap-1 group-hover:text-white transition-colors">
                Shop now
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Badge */}
      {featured && (
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur text-gray-900">
            ⭐ Featured
          </span>
        </div>
      )}

      {/* New Badge (for collections created in last 30 days - mock logic) */}
      {!featured && Math.random() > 0.7 && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
            New
          </span>
        </div>
      )}
    </Link>
  )
}

/**
 * Compact collection card for smaller spaces
 */
interface CompactCollectionCardProps {
  collection: Collection
  className?: string
}

export function CompactCollectionCard({ collection, className }: CompactCollectionCardProps) {
  return (
    <Link
      href={`/collections/${collection.handle}`}
      className={cn(
        "group flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all",
        className
      )}
    >
      {/* Collection Image */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
        {collection.image ? (
          <Image
            src={collection.image}
            alt={collection.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
          {collection.title}
        </h4>
        {collection.productCount !== undefined && (
          <p className="text-sm text-gray-500">
            {collection.productCount} products
          </p>
        )}
      </div>

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </Link>
  )
}