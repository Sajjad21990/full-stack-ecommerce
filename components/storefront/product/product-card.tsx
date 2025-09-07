import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, calculateDiscount } from '@/lib/storefront/utils'
import { Heart, ShoppingBag } from 'lucide-react'

interface ProductCardProps {
  product: {
    id: string
    title: string
    handle: string
    description?: string | null
    price: number
    compareAtPrice?: number | null
    vendor?: string | null
    productType?: string | null
    tags?: string[] | null
    inStock?: boolean
    images?: Array<{ url: string; altText?: string | null }>
  }
}

export function ProductCard({ product }: ProductCardProps) {
  const discount = calculateDiscount(product.price, product.compareAtPrice)
  const primaryImage = product.images?.[0]
  const hoverImage = product.images?.[1] || primaryImage

  return (
    <div className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      <Link href={`/products/${product.handle}`} className="block">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          {primaryImage ? (
            <>
              <Image
                src={primaryImage.url}
                alt={primaryImage.altText || product.title}
                fill
                className="object-cover transition-opacity duration-300 group-hover:opacity-0"
              />
              <Image
                src={hoverImage.url}
                alt={hoverImage.altText || product.title}
                fill
                className="object-cover absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <ShoppingBag className="h-12 w-12" />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-2">
            {discount && (
              <span className="bg-red-500 text-white px-2 py-1 text-xs font-semibold rounded">
                -{discount}%
              </span>
            )}
            {product.inStock === false && (
              <span className="bg-gray-900 text-white px-2 py-1 text-xs font-semibold rounded">
                Out of Stock
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              className="p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow"
              aria-label="Add to wishlist"
            >
              <Heart className="h-4 w-4 text-gray-600 hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          {product.vendor && (
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {product.vendor}
            </p>
          )}
          
          <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
            {product.title}
          </h3>
          
          {product.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-3">
              {product.description}
            </p>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
          
          {product.productType && (
            <p className="text-xs text-gray-500 mt-2">
              {product.productType}
            </p>
          )}
        </div>
      </Link>
    </div>
  )
}