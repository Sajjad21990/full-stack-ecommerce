import { getCartRecommendations } from '@/lib/storefront/queries/recommendations'
import Link from 'next/link'
import { formatPrice } from '@/lib/storefront/utils'
import { Plus } from 'lucide-react'

interface CartRecommendationsProps {
  cartItems: Array<{ productId: string }>
  className?: string
}

export async function CartRecommendations({ cartItems, className = '' }: CartRecommendationsProps) {
  const cartItemIds = cartItems.map(item => item.productId)
  
  if (cartItemIds.length === 0) return null
  
  const recommendations = await getCartRecommendations(cartItemIds, 4)

  if (!recommendations || recommendations.length === 0) {
    return null
  }

  return (
    <div className={`border-t pt-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        You might also like
      </h3>
      
      <div className="space-y-3">
        {recommendations.map((product) => (
          <div key={product.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
            <Link href={`/products/${product.handle}`} className="flex-shrink-0">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-12 h-12 object-cover rounded-md"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-md" />
              )}
            </Link>
            
            <div className="flex-1 min-w-0">
              <Link
                href={`/products/${product.handle}`}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
              >
                {product.title}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-xs text-gray-500 line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                )}
              </div>
            </div>
            
            <button className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}