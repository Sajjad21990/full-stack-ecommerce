'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CreditCard, Shield, Lock } from 'lucide-react'
import { toast } from 'sonner'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface RazorpayCheckoutProps {
  orderId: string
  onSuccess?: (paymentId: string, orderId: string) => void
  onError?: (error: any) => void
  disabled?: boolean
}

interface RazorpayConfig {
  key: string
  order_id: string
  amount: number
  currency: string
  name: string
  description: string
  prefill: {
    name: string
    email: string
    contact: string
  }
  notes: Record<string, string>
  theme: {
    color: string
  }
}

export function RazorpayCheckout({ 
  orderId, 
  onSuccess, 
  onError,
  disabled = false 
}: RazorpayCheckoutProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [paymentConfig, setPaymentConfig] = useState<RazorpayConfig | null>(null)
  const [paymentId, setPaymentId] = useState<string | null>(null)

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => setIsScriptLoaded(true)
    script.onerror = () => {
      toast.error('Failed to load payment gateway')
      console.error('Failed to load Razorpay script')
    }
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const initializePayment = async () => {
    if (!isScriptLoaded) {
      toast.error('Payment gateway is loading. Please try again.')
      return
    }

    setIsLoading(true)
    
    try {
      // Create payment order
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      setPaymentConfig(data.razorpay)
      setPaymentId(data.payment_id)

      // Configure Razorpay options
      const options = {
        ...data.razorpay,
        handler: async (response: any) => {
          await handlePaymentSuccess(response, data.payment_id)
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false)
            toast.error('Payment cancelled')
          },
          escape: false,
          confirm_close: true
        }
      }

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options)
      
      rzp.on('payment.failed', (response: any) => {
        handlePaymentFailure(response.error, data.payment_id)
      })

      rzp.open()

    } catch (error: any) {
      console.error('Payment initialization error:', error)
      toast.error(error.message || 'Failed to initialize payment')
      setIsLoading(false)
      onError?.(error)
    }
  }

  const handlePaymentSuccess = async (razorpayResponse: any, internalPaymentId: string) => {
    try {
      // Verify payment on server
      const verificationResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_order_id: razorpayResponse.razorpay_order_id,
          razorpay_payment_id: razorpayResponse.razorpay_payment_id,
          razorpay_signature: razorpayResponse.razorpay_signature,
          payment_id: internalPaymentId
        }),
      })

      const verificationData = await verificationResponse.json()

      if (!verificationResponse.ok) {
        throw new Error(verificationData.error || 'Payment verification failed')
      }

      toast.success('Payment successful!')
      onSuccess?.(razorpayResponse.razorpay_payment_id, orderId)
      
      // Redirect to success page
      router.push(`/checkout/success?order=${verificationData.order_number}`)

    } catch (error: any) {
      console.error('Payment verification error:', error)
      toast.error(error.message || 'Payment verification failed')
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentFailure = (error: any, internalPaymentId: string) => {
    console.error('Payment failed:', error)
    
    const errorMessage = error.description || error.reason || 'Payment failed'
    toast.error(errorMessage)
    
    setIsLoading(false)
    onError?.(error)
  }

  const retryPayment = () => {
    setIsLoading(false)
    setPaymentConfig(null)
    setPaymentId(null)
  }

  if (!isScriptLoaded) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading payment gateway...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">Pay with Razorpay</h3>
            <p className="text-sm text-gray-600">
              Secure payment powered by Razorpay
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Shield className="w-4 h-4" />
            <span>256-bit SSL encryption</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Lock className="w-4 h-4" />
            <span>PCI DSS compliant</span>
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={initializePayment}
            disabled={disabled || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay Now
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-center text-gray-500">
          <p>
            By clicking "Pay Now", you agree to our terms and conditions.
            Your payment is processed securely by Razorpay.
          </p>
        </div>

        {paymentConfig && (
          <div className="pt-4 border-t">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">
                  ₹{(paymentConfig.amount / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono text-xs">{paymentConfig.order_id}</span>
              </div>
            </div>
          </div>
        )}

        {isLoading && paymentConfig && (
          <div className="text-center pt-4">
            <Button
              variant="outline"
              onClick={retryPayment}
              size="sm"
            >
              Cancel Payment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}