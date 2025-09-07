import Razorpay from 'razorpay'
import { createId } from '@paralleldrive/cuid2'

// Validate environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  throw new Error('Missing Razorpay configuration. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.')
}

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
})

// Types
export interface RazorpayOrderOptions {
  amount: number // in minor units (paise)
  currency?: string
  receipt?: string
  notes?: Record<string, string>
  partial_payment?: boolean
}

export interface RazorpayOrder {
  id: string
  entity: 'order'
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  offer_id?: string
  status: 'created' | 'attempted' | 'paid'
  attempts: number
  notes: Record<string, string>
  created_at: number
}

export interface PaymentVerificationData {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

/**
 * Create a Razorpay order
 */
export async function createRazorpayOrder(options: RazorpayOrderOptions): Promise<RazorpayOrder> {
  try {
    const orderOptions: Razorpay.IRazorpayOrderCreateOptions = {
      amount: options.amount,
      currency: options.currency || 'INR',
      receipt: options.receipt || createId(),
      notes: options.notes || {},
      partial_payment: options.partial_payment || false,
    }

    const order = await razorpay.orders.create(orderOptions) as RazorpayOrder
    return order
  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    throw new Error('Failed to create payment order')
  }
}

/**
 * Verify payment signature
 */
export function verifyPaymentSignature(data: PaymentVerificationData): boolean {
  try {
    const crypto = require('crypto')
    
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest('hex')

    return generated_signature === data.razorpay_signature
  } catch (error) {
    console.error('Error verifying payment signature:', error)
    return false
  }
}

/**
 * Fetch payment details
 */
export async function getPaymentDetails(paymentId: string) {
  try {
    const payment = await razorpay.payments.fetch(paymentId)
    return payment
  } catch (error) {
    console.error('Error fetching payment details:', error)
    throw new Error('Failed to fetch payment details')
  }
}

/**
 * Capture payment (for authorized payments)
 */
export async function capturePayment(paymentId: string, amount: number, currency = 'INR') {
  try {
    const capture = await razorpay.payments.capture(paymentId, amount, currency)
    return capture
  } catch (error) {
    console.error('Error capturing payment:', error)
    throw new Error('Failed to capture payment')
  }
}

/**
 * Create a refund
 */
export async function createRefund(
  paymentId: string, 
  amount?: number, 
  notes?: Record<string, string>
) {
  try {
    const refundData: any = {
      payment_id: paymentId,
    }

    if (amount) {
      refundData.amount = amount
    }

    if (notes) {
      refundData.notes = notes
    }

    const refund = await razorpay.refunds.create(refundData)
    return refund
  } catch (error) {
    console.error('Error creating refund:', error)
    throw new Error('Failed to create refund')
  }
}

/**
 * Fetch order details
 */
export async function getOrderDetails(orderId: string) {
  try {
    const order = await razorpay.orders.fetch(orderId)
    return order
  } catch (error) {
    console.error('Error fetching order details:', error)
    throw new Error('Failed to fetch order details')
  }
}

/**
 * Get order payments
 */
export async function getOrderPayments(orderId: string) {
  try {
    const payments = await razorpay.orders.fetchPayments(orderId)
    return payments
  } catch (error) {
    console.error('Error fetching order payments:', error)
    throw new Error('Failed to fetch order payments')
  }
}

/**
 * Validate webhook signature
 */
export function validateWebhookSignature(
  body: string,
  signature: string,
  secret?: string
): boolean {
  try {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET
    
    if (!webhookSecret) {
      console.error('Webhook secret not configured')
      return false
    }

    const crypto = require('crypto')
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex')

    return expectedSignature === signature
  } catch (error) {
    console.error('Error validating webhook signature:', error)
    return false
  }
}

/**
 * Get Razorpay configuration for client-side
 */
export function getRazorpayConfig() {
  return {
    key_id: RAZORPAY_KEY_ID,
    // Never expose key_secret to client
  }
}

export default razorpay