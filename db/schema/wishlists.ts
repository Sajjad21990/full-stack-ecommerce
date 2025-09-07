import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { customers } from './customers'
import { products, productVariants } from './products'

// Wishlists table
export const wishlists = pgTable('wishlists', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  sessionId: text('session_id'), // For guest wishlists
  name: text('name').notNull().default('My Wishlist'),
  description: text('description'),
  isDefault: text('is_default').notNull().default('true'), // 'true' | 'false'
  isPublic: text('is_public').notNull().default('false'), // 'true' | 'false'
  shareToken: text('share_token'),
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('wishlists_customer_idx').on(table.customerId),
  sessionIdx: index('wishlists_session_idx').on(table.sessionId),
}))

// Wishlist items
export const wishlistItems = pgTable('wishlist_items', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  wishlistId: text('wishlist_id').notNull().references(() => wishlists.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  variantId: text('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),
  
  // Denormalized product info for performance
  productTitle: text('product_title').notNull(),
  productHandle: text('product_handle').notNull(),
  productImage: text('product_image'),
  variantTitle: text('variant_title'),
  variantImage: text('variant_image'),
  price: text('price').notNull(), // Stored as string to preserve exact pricing
  compareAtPrice: text('compare_at_price'),
  
  // Notes
  notes: text('notes'),
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  wishlistIdx: index('wishlist_items_wishlist_idx').on(table.wishlistId),
  productIdx: index('wishlist_items_product_idx').on(table.productId),
  variantIdx: index('wishlist_items_variant_idx').on(table.variantId),
}))