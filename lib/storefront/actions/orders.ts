'use server'

import { db } from '@/lib/db'
import { orders, orderItems, payments } from '@/db/schema/orders'
import { customers } from '@/db/schema/customers'
import { Cart } from '@/lib/storefront/queries/cart'
import { clearCart } from '@/lib/storefront/actions/cart'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

export interface OrderFormData {
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

export interface ShippingMethod {
  id: string
  name: string
  price: number
}

const shippingMethods: Record<string, ShippingMethod> = {
  standard: { id: 'standard', name: 'Standard Delivery', price: 0 },
  express: { id: 'express', name: 'Express Delivery', price: 150 },
  overnight: { id: 'overnight', name: 'Overnight Delivery', price: 300 }
}

function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ORD-${year}${month}${day}-${random}`
}

export async function createOrder(cart: Cart, formData: OrderFormData) {
  try {
    // Calculate totals
    const subtotalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const shippingMethod = shippingMethods[formData.shippingMethod]
    const shippingAmount = shippingMethod?.price || 0
    const taxAmount = Math.round(subtotalAmount * 0.18) // 18% GST
    const totalAmount = subtotalAmount + shippingAmount + taxAmount

    // Generate order number
    const orderNumber = generateOrderNumber()

    // Prepare addresses
    const shippingAddress = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      address1: formData.shippingAddress.address1,
      address2: formData.shippingAddress.address2,
      city: formData.shippingAddress.city,
      state: formData.shippingAddress.state,
      zipCode: formData.shippingAddress.zipCode,
      country: formData.shippingAddress.country,
      phone: formData.phone
    }

    const billingAddress = formData.sameBillingAddress 
      ? shippingAddress 
      : {
          firstName: formData.firstName,
          lastName: formData.lastName,
          address1: formData.billingAddress.address1,
          address2: formData.billingAddress.address2,
          city: formData.billingAddress.city,
          state: formData.billingAddress.state,
          zipCode: formData.billingAddress.zipCode,
          country: formData.billingAddress.country,
          phone: formData.phone
        }

    // Find or create customer if account creation is requested
    let customerId: string | null = null
    if (formData.createAccount) {
      try {
        // Check if customer already exists
        const existingCustomer = await db.query.customers.findFirst({
          where: eq(customers.email, formData.email)
        })

        if (existingCustomer) {
          customerId = existingCustomer.id
        } else {
          // Create new customer
          const [newCustomer] = await db.insert(customers).values({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            acceptsMarketing: false,
            addresses: [shippingAddress]
          }).returning()
          
          customerId = newCustomer.id
        }
      } catch (error) {
        console.error('Error creating customer:', error)
        // Continue without customer creation
      }
    }

    // Create order
    const [order] = await db.insert(orders).values({
      orderNumber,
      customerId,
      email: formData.email,
      phone: formData.phone,
      currency: 'INR',
      subtotalAmount,
      shippingAmount,
      taxAmount,
      totalAmount,
      shippingAddress,
      billingAddress,
      shippingMethodId: formData.shippingMethod,
      shippingMethodName: shippingMethod?.name,
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      financialStatus: 'pending',
      notes: formData.notes,
      customerNotes: formData.notes,
      source: 'web'
    }).returning()

    // Create order items
    for (const item of cart.items) {
      await db.insert(orderItems).values({
        orderId: order.id,
        variantId: item.variantId,
        productId: item.productId,
        productTitle: item.productTitle,
        productHandle: item.productHandle,
        productImage: item.image,
        variantTitle: item.variantTitle || 'Default Title',
        variantImage: item.image,
        sku: item.sku,
        quantity: item.quantity,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        subtotal: item.price * item.quantity,
        total: item.price * item.quantity,
        taxable: true,
        requiresShipping: true,
        fulfillmentStatus: 'unfulfilled'
      })
    }

    // Create payment record
    await db.insert(payments).values({
      orderId: order.id,
      amount: totalAmount,
      currency: 'INR',
      status: 'pending',
      gateway: formData.paymentMethod === 'cod' ? 'cod' : 'razorpay',
      paymentMethod: formData.paymentMethod === 'cod' ? 'cod' : 'card'
    })

    // Clear the cart
    await clearCart()

    return { success: true, orderNumber, orderId: order.id }
  } catch (error) {
    console.error('Error creating order:', error)
    return { success: false, error: 'Failed to create order' }
  }
}

export async function getOrder(orderIdentifier: string) {
  try {
    // Try to get by orderNumber first, then by ID
    let order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderIdentifier),
      with: {
        items: true,
        payments: true
      }
    })

    // If not found by orderNumber, try by ID
    if (!order) {
      order = await db.query.orders.findFirst({
        where: eq(orders.id, orderIdentifier),
        with: {
          items: true,
          payments: true
        }
      })
    }

    return order
  } catch (error) {
    console.error('Error fetching order:', error)
    return null
  }
}

export async function processPayment(orderId: string, paymentMethod: string) {
  try {
    if (paymentMethod === 'cod') {
      // For COD, just update the order status
      await db.update(orders)
        .set({ 
          status: 'processing',
          paymentStatus: 'pending',
          processedAt: new Date()
        })
        .where(eq(orders.id, orderId))
      
      return { success: true }
    }

    // For other payment methods, integrate with Razorpay or other gateways
    // This is a placeholder for actual payment processing
    return { success: true, requiresRedirect: true, paymentUrl: '/payment/razorpay' }
  } catch (error) {
    console.error('Error processing payment:', error)
    return { success: false, error: 'Payment processing failed' }
  }
}