import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCart } from '@/lib/storefront/actions/cart'
import { CheckoutClient } from '@/components/storefront/checkout/checkout-client'
import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'

export const metadata: Metadata = {
  title: 'Checkout | Complete Your Order',
  description: 'Review your order and complete your purchase securely.',
}

export default async function CheckoutPage() {
  const cart = await getCart()

  // Redirect to cart if empty
  if (!cart || !cart.items || cart.items.length === 0) {
    redirect('/cart')
  }

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Cart', href: '/cart' },
    { label: 'Checkout' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbs} />
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Checkout</h1>
        </div>
      </div>

      {/* Checkout Content */}
      <CheckoutClient cart={cart} />
    </div>
  )
}