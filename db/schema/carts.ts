import { pgTable, text, timestamp, integer, index, boolean, jsonb } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { customers } from './customers'
import { productVariants } from './products'

// Carts table - Server-side cart management
export const carts = pgTable('carts', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  email: text('email'), // For guest checkouts
  phone: text('phone'), // For guest checkouts
  
  // Cart token for anonymous users
  token: text('token').notNull().$defaultFn(() => createId()),
  
  // Pricing
  currency: text('currency').notNull().default('INR'),
  subtotalAmount: integer('subtotal_amount').notNull().default(0), // Before discounts and taxes
  discountAmount: integer('discount_amount').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  shippingAmount: integer('shipping_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0), // Final amount
  
  // Discount codes applied
  discountCodes: text('discount_codes').array(),
  
  // Addresses (stored as JSONB for flexibility)
  shippingAddress: jsonb('shipping_address'),
  billingAddress: jsonb('billing_address'),
  
  // Selected shipping method
  shippingMethodId: text('shipping_method_id'),
  shippingMethodName: text('shipping_method_name'),
  
  // Notes
  notes: text('notes'),
  attributes: jsonb('attributes'), // Custom attributes
  
  // Status
  status: text('status').notNull().default('active'), // 'active' | 'abandoned' | 'converted'
  completedAt: timestamp('completed_at', { mode: 'date' }), // When converted to order
  abandonedAt: timestamp('abandoned_at', { mode: 'date' }), // When considered abandoned
  
  // Timestamps
  expiresAt: timestamp('expires_at', { mode: 'date' }), // Cart expiration
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  tokenIdx: index('carts_token_idx').on(table.token),
  customerIdx: index('carts_customer_idx').on(table.customerId),
  emailIdx: index('carts_email_idx').on(table.email),
  statusIdx: index('carts_status_idx').on(table.status),
  expiresIdx: index('carts_expires_idx').on(table.expiresAt),
  updatedIdx: index('carts_updated_idx').on(table.updatedAt),
}))

// Cart items
export const cartItems = pgTable('cart_items', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  cartId: text('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  
  // Product info (denormalized for performance)
  productId: text('product_id').notNull(),
  productTitle: text('product_title').notNull(),
  productHandle: text('product_handle').notNull(),
  productImage: text('product_image'),
  variantTitle: text('variant_title').notNull(),
  variantImage: text('variant_image'),
  sku: text('sku'),
  
  // Quantity and pricing
  quantity: integer('quantity').notNull().default(1),
  price: integer('price').notNull(), // Unit price at time of addition
  compareAtPrice: integer('compare_at_price'),
  
  // Discounts
  discountAmount: integer('discount_amount').notNull().default(0),
  discountedPrice: integer('discounted_price').notNull(), // Price after discount
  
  // Line totals
  subtotal: integer('subtotal').notNull(), // quantity * price
  total: integer('total').notNull(), // After discounts
  
  // Tax
  taxable: boolean('taxable').notNull().default(true),
  taxAmount: integer('tax_amount').notNull().default(0),
  
  // Shipping
  requiresShipping: boolean('requires_shipping').notNull().default(true),
  
  // Custom properties
  properties: jsonb('properties'), // Custom line item properties
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  cartIdx: index('cart_items_cart_idx').on(table.cartId),
  variantIdx: index('cart_items_variant_idx').on(table.variantId),
  productIdx: index('cart_items_product_idx').on(table.productId),
}))