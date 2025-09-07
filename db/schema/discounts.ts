import { pgTable, text, timestamp, integer, index, boolean, jsonb, decimal, primaryKey } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { customers } from './customers'
import { collections } from './collections'
import { products } from './products'

// Discounts table
export const discounts = pgTable('discounts', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  code: text('code').notNull(), // Discount code (can be empty for automatic discounts)
  title: text('title').notNull(),
  description: text('description'),
  
  // Type
  type: text('type').notNull(), // 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
  value: integer('value').notNull(), // Percentage (in basis points) or amount (in minor units)
  
  // Application
  appliesToType: text('applies_to_type').notNull().default('all'), // 'all' | 'products' | 'collections'
  minimumAmount: integer('minimum_amount'), // Minimum order value
  maximumAmount: integer('maximum_amount'), // Maximum discount amount (for percentage discounts)
  
  // Usage limits
  usageLimit: integer('usage_limit'), // Total usage limit
  usageLimitPerCustomer: integer('usage_limit_per_customer'), // Per customer limit
  currentUsage: integer('current_usage').notNull().default(0),
  
  // Eligibility
  customerEligibility: text('customer_eligibility').notNull().default('all'), // 'all' | 'specific' | 'groups'
  prerequisiteCustomerIds: text('prerequisite_customer_ids').array(),
  oncePerCustomer: boolean('once_per_customer').notNull().default(false),
  
  // Buy X Get Y specific
  prerequisiteQuantity: integer('prerequisite_quantity'), // Buy X
  entitledQuantity: integer('entitled_quantity'), // Get Y
  
  // Scheduling
  startsAt: timestamp('starts_at', { mode: 'date' }),
  endsAt: timestamp('ends_at', { mode: 'date' }),
  
  // Status
  status: text('status').notNull().default('draft'), // 'active' | 'scheduled' | 'expired' | 'disabled' | 'draft'
  
  // Settings
  combinesWith: jsonb('combines_with'), // Which discount types this can combine with
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  codeIdx: index('discounts_code_idx').on(table.code),
  typeIdx: index('discounts_type_idx').on(table.type),
  statusIdx: index('discounts_status_idx').on(table.status),
  startsIdx: index('discounts_starts_idx').on(table.startsAt),
  endsIdx: index('discounts_ends_idx').on(table.endsAt),
}))

// Discount products (for product-specific discounts)
export const discountProducts = pgTable('discount_products', {
  discountId: text('discount_id').notNull().references(() => discounts.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.discountId, table.productId] }),
  discountIdx: index('discount_products_discount_idx').on(table.discountId),
  productIdx: index('discount_products_product_idx').on(table.productId),
}))

// Discount collections (for collection-specific discounts)
export const discountCollections = pgTable('discount_collections', {
  discountId: text('discount_id').notNull().references(() => discounts.id, { onDelete: 'cascade' }),
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.discountId, table.collectionId] }),
  discountIdx: index('discount_collections_discount_idx').on(table.discountId),
  collectionIdx: index('discount_collections_collection_idx').on(table.collectionId),
}))

// Discount usage tracking
export const discountUsages = pgTable('discount_usages', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  discountId: text('discount_id').notNull().references(() => discounts.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  orderId: text('order_id'), // Reference to order
  
  // Usage details
  discountAmount: integer('discount_amount').notNull(),
  currency: text('currency').notNull().default('INR'),
  
  // Timestamp
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  discountIdx: index('discount_usages_discount_idx').on(table.discountId),
  customerIdx: index('discount_usages_customer_idx').on(table.customerId),
  orderIdx: index('discount_usages_order_idx').on(table.orderId),
}))

// Gift cards table
export const giftCards = pgTable('gift_cards', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  code: text('code').notNull(), // Gift card code
  
  // Value
  initialAmount: integer('initial_amount').notNull(), // Original value in minor units
  currentAmount: integer('current_amount').notNull(), // Remaining balance
  currency: text('currency').notNull().default('INR'),
  
  // Status
  status: text('status').notNull().default('active'), // 'active' | 'used' | 'expired' | 'disabled'
  
  // Customer info
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  recipientEmail: text('recipient_email'),
  recipientName: text('recipient_name'),
  senderName: text('sender_name'),
  message: text('message'),
  
  // Usage tracking
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
  
  // Expiration
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  codeIdx: index('gift_cards_code_idx').on(table.code),
  statusIdx: index('gift_cards_status_idx').on(table.status),
  customerIdx: index('gift_cards_customer_idx').on(table.customerId),
  expiresIdx: index('gift_cards_expires_idx').on(table.expiresAt),
}))

// Gift card transactions
export const giftCardTransactions = pgTable('gift_card_transactions', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  giftCardId: text('gift_card_id').notNull().references(() => giftCards.id, { onDelete: 'cascade' }),
  
  // Transaction details
  type: text('type').notNull(), // 'issued' | 'used' | 'refunded' | 'expired'
  amount: integer('amount').notNull(), // Amount used/added (negative for usage)
  balanceAfter: integer('balance_after').notNull(),
  
  // References
  orderId: text('order_id'), // Order where gift card was used
  refundId: text('refund_id'), // Refund that added balance
  
  // Timestamp
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  giftCardIdx: index('gift_card_transactions_card_idx').on(table.giftCardId),
  typeIdx: index('gift_card_transactions_type_idx').on(table.type),
  orderIdx: index('gift_card_transactions_order_idx').on(table.orderId),
}))