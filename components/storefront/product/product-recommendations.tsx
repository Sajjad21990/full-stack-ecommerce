import { ProductCard } from './product-card'
import { getProductRecommendations } from '@/lib/storefront/queries/recommendations'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface ProductRecommendationsProps {
  productId: string
  title?: string
  strategy?: 'similar' | 'popular' | 'cross-sell' | 'upsell'
  limit?: number
  showViewAll?: boolean
}

export async function ProductRecommendations({
  productId,
  title = "You Might Also Like",
  strategy = 'similar',
  limit = 8,
  showViewAll = false
}: ProductRecommendationsProps) {
  const recommendations = await getProductRecommendations(productId, {
    limit,
    strategy
  })

  if (!recommendations || recommendations.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-gray-600 mt-1">
              {strategy === 'upsell' && 'Premium alternatives'}
              {strategy === 'cross-sell' && 'Frequently bought together'}
              {strategy === 'similar' && 'Similar products you may like'}
              {strategy === 'popular' && 'Popular right now'}
            </p>
          </div>
          
          {showViewAll && (
            <Link
              href={`/search?related=${productId}`}
              className="hidden sm:flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recommendations.map((product) => (
            <div key={product.id} className="group">
              <ProductCard product={product} />
              
              {/* Strategy-specific indicators */}
              {strategy === 'upsell' && product.priceMultiplier && (
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {Math.round((product.priceMultiplier - 1) * 100)}% upgrade
                  </span>
                </div>
              )}
              
              {strategy === 'cross-sell' && (
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Often bought together
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile View All */}
        {showViewAll && (
          <div className="mt-8 text-center sm:hidden">
            <Link
              href={`/search?related=${productId}`}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All Recommendations
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

/**
 * Compact recommendations for smaller spaces (e.g., cart drawer, modals)
 */
interface CompactRecommendationsProps {
  productId: string
  limit?: number
  strategy?: 'similar' | 'cross-sell' | 'upsell'
  className?: string
}

export async function CompactRecommendations({
  productId,
  limit = 4,
  strategy = 'similar',
  className = ''
}: CompactRecommendationsProps) {
  const recommendations = await getProductRecommendations(productId, {
    limit,
    strategy
  })

  if (!recommendations || recommendations.length === 0) {
    return null
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900">
        {strategy === 'cross-sell' ? 'Add to your order' : 'You might also like'}
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {recommendations.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.handle}`}
            className="group border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:shadow-md transition-all"
          >
            {product.image && (
              <div className="aspect-square bg-gray-100 rounded-md mb-2 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </div>
            )}
            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
              {product.title}
            </h4>
            <p className="text-sm font-semibold text-gray-900">
              ₹{(product.price / 100).toFixed(2)}
            </p>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <p className="text-xs text-gray-500 line-through">
                ₹{(product.compareAtPrice / 100).toFixed(2)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}