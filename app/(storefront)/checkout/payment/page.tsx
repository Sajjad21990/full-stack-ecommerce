import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getOrder } from '@/lib/storefront/actions/orders'
import { PaymentPage } from './payment-client'

interface PaymentPageProps {
  searchParams: { order?: string }
}

export default async function CheckoutPaymentPage({ searchParams }: PaymentPageProps) {
  const orderId = searchParams.order

  if (!orderId) {
    redirect('/checkout')
  }

  const order = await getOrder(orderId)

  if (!order) {
    notFound()
  }

  // Redirect if order is already paid
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'authorized') {
    redirect(`/checkout/success?order=${order.orderNumber}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Suspense fallback={<PaymentPageSkeleton />}>
          <PaymentPage order={order} />
        </Suspense>
      </div>
    </div>
  )
}

function PaymentPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-full"></div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    </div>
  )
}