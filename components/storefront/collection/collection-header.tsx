import Image from 'next/image'
import { Package, Tag, Calendar } from 'lucide-react'

interface CollectionHeaderProps {
  collection: {
    id?: string
    title: string
    description?: string | null
    image?: string | null
    productCount?: number
  }
}

export function CollectionHeader({ collection }: CollectionHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {collection.image ? (
        <div className="relative">
          {/* Hero Image */}
          <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
            <Image
              src={collection.image}
              alt={collection.title}
              fill
              className="object-cover"
              priority
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>

          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
            <div className="max-w-3xl">
              {/* Collection Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {collection.title}
              </h1>
              
              {/* Collection Description */}
              {collection.description && (
                <p className="text-lg md:text-xl text-gray-200 mb-6 leading-relaxed">
                  {collection.description}
                </p>
              )}
              
              {/* Collection Stats */}
              <div className="flex flex-wrap items-center gap-4 text-sm md:text-base">
                {collection.productCount !== undefined && (
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-3 py-1">
                    <Package className="h-4 w-4" />
                    <span>{collection.productCount} Products</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-3 py-1">
                  <Tag className="h-4 w-4" />
                  <span>Collection</span>
                </div>
                
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-3 py-1">
                  <Calendar className="h-4 w-4" />
                  <span>Updated recently</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Alternative Layout for Collections without images */
        <div className="p-6 md:p-8 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {collection.title}
            </h1>
            
            {collection.description && (
              <p className="text-lg text-gray-600 mb-6">
                {collection.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
              {collection.productCount !== undefined && (
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <span>{collection.productCount} Products</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>Collection</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}