'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Loader2, CreditCard, Truck, User, Mail, Phone } from 'lucide-react'
import { Cart } from '@/lib/storefront/queries/cart'
import { createOrder, OrderFormData } from '@/lib/storefront/actions/orders'
import { cn } from '@/lib/utils'

interface CheckoutFormProps {
  cart: Cart
  currentStep: number
  setCurrentStep: (step: number) => void
  onShippingMethodChange: (method: string) => void
}

interface FormData extends OrderFormData {
  // Customer Information
  email: string
  firstName: string
  lastName: string
  phone: string
  createAccount: boolean
  
  // Shipping Address
  shippingAddress: {
    address1: string
    address2: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  
  // Billing Address
  sameBillingAddress: boolean
  billingAddress: {
    address1: string
    address2: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  
  // Shipping Method
  shippingMethod: string
  
  // Payment
  paymentMethod: string
  
  // Notes
  notes: string
}

const shippingMethods = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    description: '5-7 business days',
    price: 0,
    estimatedDays: '5-7'
  },
  {
    id: 'express',
    name: 'Express Delivery',
    description: '2-3 business days',
    price: 150,
    estimatedDays: '2-3'
  },
  {
    id: 'overnight',
    name: 'Overnight Delivery',
    description: 'Next business day',
    price: 300,
    estimatedDays: '1'
  }
]

const paymentMethods = [
  {
    id: 'razorpay',
    name: 'Card / UPI / Wallet',
    description: 'Pay securely with Razorpay',
    icon: CreditCard
  },
  {
    id: 'cod',
    name: 'Cash on Delivery',
    description: 'Pay when your order arrives',
    icon: Truck
  }
]

export function CheckoutForm({ cart, currentStep, setCurrentStep, onShippingMethodChange }: CheckoutFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    createAccount: false,
    shippingAddress: {
      address1: '',
      address2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    },
    sameBillingAddress: true,
    billingAddress: {
      address1: '',
      address2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    },
    shippingMethod: 'standard',
    paymentMethod: 'razorpay',
    notes: ''
  })

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates }
      
      // Notify parent of shipping method changes
      if (updates.shippingMethod) {
        onShippingMethodChange(updates.shippingMethod)
      }
      
      return newData
    })
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.email && formData.firstName && formData.lastName)
      case 2:
        return !!(formData.shippingAddress.address1 && formData.shippingAddress.city && 
                 formData.shippingAddress.state && formData.shippingAddress.zipCode)
      case 3:
        return !!formData.shippingMethod
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      const result = await createOrder(cart, formData)
      
      if (result.success) {
        // For COD, redirect directly to success page
        if (formData.paymentMethod === 'cod') {
          router.push(`/checkout/success?order=${result.orderNumber}`)
        } else {
          // For online payment, redirect to payment page
          router.push(`/checkout/payment?order=${result.orderId}`)
        }
      } else {
        console.error('Order creation failed:', result.error)
        alert('Failed to create order. Please try again.')
      }
    } catch (error) {
      console.error('Order submission failed:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              placeholder="your@email.com"
              required
              className="mt-1"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateFormData({ firstName: e.target.value })}
                placeholder="John"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateFormData({ lastName: e.target.value })}
                placeholder="Doe"
                required
                className="mt-1"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateFormData({ phone: e.target.value })}
              placeholder="+91 9876543210"
              className="mt-1"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="createAccount"
              checked={formData.createAccount}
              onCheckedChange={(checked) => updateFormData({ createAccount: checked as boolean })}
            />
            <Label htmlFor="createAccount" className="text-sm">
              Create an account for faster checkout next time
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address1">Address Line 1 *</Label>
            <Input
              id="address1"
              value={formData.shippingAddress.address1}
              onChange={(e) => updateFormData({
                shippingAddress: { ...formData.shippingAddress, address1: e.target.value }
              })}
              placeholder="123 Main Street"
              required
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="address2">Address Line 2</Label>
            <Input
              id="address2"
              value={formData.shippingAddress.address2}
              onChange={(e) => updateFormData({
                shippingAddress: { ...formData.shippingAddress, address2: e.target.value }
              })}
              placeholder="Apartment, suite, etc."
              className="mt-1"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.shippingAddress.city}
                onChange={(e) => updateFormData({
                  shippingAddress: { ...formData.shippingAddress, city: e.target.value }
                })}
                placeholder="Mumbai"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.shippingAddress.state}
                onChange={(e) => updateFormData({
                  shippingAddress: { ...formData.shippingAddress, state: e.target.value }
                })}
                placeholder="Maharashtra"
                required
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="zipCode">PIN Code *</Label>
              <Input
                id="zipCode"
                value={formData.shippingAddress.zipCode}
                onChange={(e) => updateFormData({
                  shippingAddress: { ...formData.shippingAddress, zipCode: e.target.value }
                })}
                placeholder="400001"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="country">Country *</Label>
              <Input
                id="country"
                value={formData.shippingAddress.country}
                onChange={(e) => updateFormData({
                  shippingAddress: { ...formData.shippingAddress, country: e.target.value }
                })}
                placeholder="India"
                required
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Shipping Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.shippingMethod}
            onValueChange={(value) => updateFormData({ shippingMethod: value })}
            className="space-y-4"
          >
            {shippingMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-3">
                <RadioGroupItem value={method.id} id={method.id} />
                <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{method.name}</div>
                      <div className="text-sm text-gray-500">{method.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {method.price === 0 ? 'Free' : `₹${method.price}`}
                      </div>
                      <div className="text-sm text-gray-500">{method.estimatedDays} days</div>
                    </div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.paymentMethod}
            onValueChange={(value) => updateFormData({ paymentMethod: value })}
            className="space-y-4"
          >
            {paymentMethods.map((method) => {
              const Icon = method.icon
              return (
                <div key={method.id} className="flex items-center space-x-3">
                  <RadioGroupItem value={method.id} id={method.id} />
                  <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-gray-500">{method.description}</div>
                      </div>
                    </div>
                  </Label>
                </div>
              )
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any special instructions for your order..."
            value={formData.notes}
            onChange={(e) => updateFormData({ notes: e.target.value })}
            rows={3}
          />
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      
      <Separator />
      
      <div className="flex justify-between items-center">
        {currentStep > 1 ? (
          <Button variant="outline" onClick={prevStep}>
            Back
          </Button>
        ) : (
          <div />
        )}
        
        {currentStep < 3 ? (
          <Button 
            onClick={nextStep}
            disabled={!validateStep(currentStep)}
            className={cn(!validateStep(currentStep) && "opacity-50 cursor-not-allowed")}
          >
            Continue
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !validateStep(currentStep)}
            className={cn(
              "min-w-[120px]",
              (!validateStep(currentStep) || isSubmitting) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Complete Order'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}