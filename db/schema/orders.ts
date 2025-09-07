import { pgTable, text, timestamp, integer, index, boolean, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { customers } from './customers'
import { productVariants } from './products'
import { users } from './auth'

// Orders table
export const orders = pgTable('orders', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  orderNumber: text('order_number').notNull(), // Human-readable order number
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  
  // Customer info (denormalized)
  email: text('email').notNull(),
  phone: text('phone'),
  
  // Pricing
  currency: text('currency').notNull().default('INR'),
  subtotalAmount: integer('subtotal_amount').notNull().default(0),
  discountAmount: integer('discount_amount').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  shippingAmount: integer('shipping_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  
  // Discount codes used
  discountCodes: text('discount_codes').array(),
  
  // Addresses
  shippingAddress: jsonb('shipping_address').notNull(),
  billingAddress: jsonb('billing_address').notNull(),
  
  // Shipping
  shippingMethodId: text('shipping_method_id'),
  shippingMethodName: text('shipping_method_name'),
  
  // Status
  status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  paymentStatus: text('payment_status').notNull().default('pending'), // 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'partially_refunded' | 'failed'
  fulfillmentStatus: text('fulfillment_status').notNull().default('unfulfilled'), // 'unfulfilled' | 'partial' | 'fulfilled' | 'cancelled'
  
  // Financial
  financialStatus: text('financial_status').notNull().default('pending'), // 'pending' | 'authorized' | 'paid' | 'partially_paid' | 'refunded' | 'partially_refunded' | 'voided'
  
  // Notes
  notes: text('notes'),
  customerNotes: text('customer_notes'),
  tags: text('tags').array(),
  
  // Metadata
  source: text('source').notNull().default('web'), // 'web' | 'pos' | 'mobile' | 'manual'
  sourceUrl: text('source_url'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  
  // Cancellation
  cancelledAt: timestamp('cancelled_at', { mode: 'date' }),
  cancelReason: text('cancel_reason'),
  cancelledBy: text('cancelled_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Timestamps
  processedAt: timestamp('processed_at', { mode: 'date' }),
  closedAt: timestamp('closed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  orderNumberIdx: uniqueIndex('orders_number_idx').on(table.orderNumber),
  customerIdx: index('orders_customer_idx').on(table.customerId),
  emailIdx: index('orders_email_idx').on(table.email),
  statusIdx: index('orders_status_idx').on(table.status),
  paymentStatusIdx: index('orders_payment_status_idx').on(table.paymentStatus),
  fulfillmentStatusIdx: index('orders_fulfillment_status_idx').on(table.fulfillmentStatus),
  createdIdx: index('orders_created_idx').on(table.createdAt),
}))

// Order items
export const orderItems = pgTable('order_items', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  
  // Product info (denormalized)
  productId: text('product_id').notNull(),
  productTitle: text('product_title').notNull(),
  productHandle: text('product_handle').notNull(),
  productImage: text('product_image'),
  variantTitle: text('variant_title').notNull(),
  variantImage: text('variant_image'),
  sku: text('sku'),
  barcode: text('barcode'),
  
  // Quantities and pricing
  quantity: integer('quantity').notNull(),
  price: integer('price').notNull(),
  compareAtPrice: integer('compare_at_price'),
  
  // Discounts
  discountAmount: integer('discount_amount').notNull().default(0),
  
  // Totals
  subtotal: integer('subtotal').notNull(),
  total: integer('total').notNull(),
  
  // Tax
  taxable: boolean('taxable').notNull().default(true),
  taxAmount: integer('tax_amount').notNull().default(0),
  taxCode: text('tax_code'),
  
  // Fulfillment
  requiresShipping: boolean('requires_shipping').notNull().default(true),
  fulfillmentStatus: text('fulfillment_status').notNull().default('unfulfilled'),
  fulfillmentQuantity: integer('fulfillment_quantity').notNull().default(0),
  
  // Properties
  properties: jsonb('properties'),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
  variantIdx: index('order_items_variant_idx').on(table.variantId),
  productIdx: index('order_items_product_idx').on(table.productId),
}))

// Payments table
export const payments = pgTable('payments', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Payment details
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  status: text('status').notNull().default('pending'), // 'pending' | 'authorized' | 'captured' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'
  
  // Gateway info
  gateway: text('gateway').notNull(), // 'razorpay' | 'stripe' | 'manual' | 'cod'
  gatewayTransactionId: text('gateway_transaction_id'),
  gatewayResponse: jsonb('gateway_response'),
  
  // Method
  paymentMethod: text('payment_method'), // 'card' | 'upi' | 'netbanking' | 'wallet' | 'cod'
  
  // Card info (if applicable)
  cardLast4: text('card_last_4'),
  cardBrand: text('card_brand'),
  
  // Idempotency
  idempotencyKey: text('idempotency_key'),
  
  // Timestamps
  authorizedAt: timestamp('authorized_at', { mode: 'date' }),
  capturedAt: timestamp('captured_at', { mode: 'date' }),
  failedAt: timestamp('failed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('payments_order_idx').on(table.orderId),
  statusIdx: index('payments_status_idx').on(table.status),
  gatewayIdx: index('payments_gateway_idx').on(table.gateway),
  idempotencyIdx: uniqueIndex('payments_idempotency_idx').on(table.idempotencyKey),
}))

// Refunds table
export const refunds = pgTable('refunds', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  paymentId: text('payment_id').references(() => payments.id, { onDelete: 'set null' }),
  
  // Refund details
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  reason: text('reason').notNull(), // 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other'
  notes: text('notes'),
  
  // Status
  status: text('status').notNull().default('pending'), // 'pending' | 'success' | 'failure' | 'cancelled'
  
  // Gateway info
  gatewayRefundId: text('gateway_refund_id'),
  gatewayResponse: jsonb('gateway_response'),
  
  // User tracking
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Timestamps
  processedAt: timestamp('processed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('refunds_order_idx').on(table.orderId),
  paymentIdx: index('refunds_payment_idx').on(table.paymentId),
  statusIdx: index('refunds_status_idx').on(table.status),
}))

// Shipments table
export const shipments = pgTable('shipments', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Tracking
  trackingNumber: text('tracking_number'),
  trackingUrl: text('tracking_url'),
  carrier: text('carrier'),
  service: text('service'),
  
  // Status
  status: text('status').notNull().default('pending'), // 'pending' | 'ready' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed'
  
  // Shipping details
  shippingAddress: jsonb('shipping_address').notNull(),
  
  // Timestamps
  shippedAt: timestamp('shipped_at', { mode: 'date' }),
  deliveredAt: timestamp('delivered_at', { mode: 'date' }),
  estimatedDeliveryAt: timestamp('estimated_delivery_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('shipments_order_idx').on(table.orderId),
  statusIdx: index('shipments_status_idx').on(table.status),
  trackingIdx: index('shipments_tracking_idx').on(table.trackingNumber),
}))

// Shipment items
export const shipmentItems = pgTable('shipment_items', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  shipmentId: text('shipment_id').notNull().references(() => shipments.id, { onDelete: 'cascade' }),
  orderItemId: text('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  shipmentIdx: index('shipment_items_shipment_idx').on(table.shipmentId),
  orderItemIdx: index('shipment_items_order_item_idx').on(table.orderItemId),
}))

// Returns table
export const returns = pgTable('returns', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  returnNumber: text('return_number').notNull(),
  
  // Status
  status: text('status').notNull().default('requested'), // 'requested' | 'approved' | 'rejected' | 'received' | 'processed'
  
  // Reason
  reason: text('reason').notNull(), // 'damaged' | 'wrong_item' | 'not_as_described' | 'quality' | 'other'
  notes: text('notes'),
  
  // Resolution
  resolution: text('resolution'), // 'refund' | 'exchange' | 'store_credit'
  
  // User tracking
  createdBy: text('created_by').references(() => customers.id, { onDelete: 'set null' }),
  approvedBy: text('approved_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Timestamps
  approvedAt: timestamp('approved_at', { mode: 'date' }),
  receivedAt: timestamp('received_at', { mode: 'date' }),
  processedAt: timestamp('processed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('returns_order_idx').on(table.orderId),
  returnNumberIdx: uniqueIndex('returns_number_idx').on(table.returnNumber),
  statusIdx: index('returns_status_idx').on(table.status),
}))

// Return items
export const returnItems = pgTable('return_items', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  returnId: text('return_id').notNull().references(() => returns.id, { onDelete: 'cascade' }),
  orderItemId: text('order_item_id').notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  notes: text('notes'),
  restockable: boolean('restockable').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  returnIdx: index('return_items_return_idx').on(table.returnId),
  orderItemIdx: index('return_items_order_item_idx').on(table.orderItemId),
}))

// Order status history - Track status changes
export const orderStatusHistory = pgTable('order_status_history', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  
  // Status changes
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  statusType: text('status_type').notNull(), // 'order' | 'payment' | 'fulfillment'
  
  // Additional context
  notes: text('notes'),
  isPublic: boolean('is_public').notNull().default(false), // Whether customer can see this
  
  // User tracking
  changedBy: text('changed_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('order_status_history_order_idx').on(table.orderId),
  statusTypeIdx: index('order_status_history_status_type_idx').on(table.statusType),
  createdIdx: index('order_status_history_created_idx').on(table.createdAt),
}))