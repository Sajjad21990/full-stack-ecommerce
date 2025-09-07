import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCart } from '@/lib/storefront/actions/cart'
import { getProductRecommendations } from '@/lib/storefront/queries/recommendations'
import { CartItems } from '@/components/storefront/cart/cart-items'
import { CartSummary } from '@/components/storefront/cart/cart-summary'
import { ProductRecommendations } from '@/components/storefront/product/product-recommendations'
import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'
import { ShoppingCart } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Shopping Cart | Review Your Items',
  description: 'Review and modify items in your shopping cart before checkout.',
}

export default async function CartPage() {
  const cart = await getCart()

  // Get recommendations based on cart items
  let recommendations: any[] = []
  if (cart && cart.items.length > 0) {
    try {
      // Get recommendations based on the first item in cart
      const recs = await getProductRecommendations(cart.items[0].productId, {
        limit: 4,
        type: 'cross_sell'
      })
      recommendations = recs || []
    } catch (error) {
      console.error('Error fetching recommendations:', error)
    }
  }

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Shopping Cart' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbs} />
          <div className="flex items-center gap-3 mt-4">
            <ShoppingCart className="w-6 h-6" />
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
            {cart && cart.totalQuantity > 0 && (
              <span className="text-sm text-gray-600">
                ({cart.totalQuantity} {cart.totalQuantity === 1 ? 'item' : 'items'})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!cart || cart.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
            </p>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Continue Shopping
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <CartItems cart={cart} />
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <CartSummary cart={cart} />
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-16">
            <ProductRecommendations 
              products={recommendations}
              title="You might also like"
              subtitle="Based on items in your cart"
            />
          </div>
        )}
      </div>
    </div>
  )
}