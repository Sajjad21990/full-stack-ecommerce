'use client'

import { useState } from 'react'
import { CheckoutForm } from './checkout-form'
import { CheckoutSummary } from './checkout-summary'
import { CheckoutSteps } from './checkout-steps'
import { Cart } from '@/lib/storefront/queries/cart'

interface CheckoutClientProps {
  cart: Cart
}

const shippingMethods = {
  standard: { price: 0 },
  express: { price: 150 },
  overnight: { price: 300 }
}

export function CheckoutClient({ cart }: CheckoutClientProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [shippingMethod, setShippingMethod] = useState('standard')
  
  const shippingCost = shippingMethods[shippingMethod as keyof typeof shippingMethods]?.price || 0

  return (
    <>
      {/* Checkout Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CheckoutSteps currentStep={currentStep} />
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <CheckoutForm 
              cart={cart} 
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              onShippingMethodChange={setShippingMethod}
            />
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <CheckoutSummary cart={cart} shippingCost={shippingCost} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}