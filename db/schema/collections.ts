import { pgTable, text, timestamp, boolean, index, uniqueIndex, integer, primaryKey } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { products } from './products'

// Collections table - Group products for merchandising
export const collections = pgTable('collections', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  handle: text('handle').notNull(), // URL-friendly slug
  title: text('title').notNull(),
  description: text('description'),
  image: text('image'), // Collection image URL
  
  // SEO
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  
  // Rules for automatic collection
  rules: text('rules'), // JSON string of collection rules
  rulesType: text('rules_type').default('manual'), // 'manual' | 'automated'
  
  // Display
  sortOrder: text('sort_order').notNull().default('manual'), // 'manual' | 'alpha-asc' | 'alpha-desc' | 'price-asc' | 'price-desc' | 'created-desc' | 'created-asc'
  position: integer('position').notNull().default(0),
  
  // Status
  status: text('status').notNull().default('draft'), // 'active' | 'draft'
  publishedAt: timestamp('published_at', { mode: 'date' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  handleIdx: uniqueIndex('collections_handle_idx').on(table.handle),
  statusIdx: index('collections_status_idx').on(table.status),
  positionIdx: index('collections_position_idx').on(table.position),
  publishedIdx: index('collections_published_idx').on(table.publishedAt),
}))

// Product-Collection junction table
export const productCollections = pgTable('product_collections', {
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0), // Position within collection
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.collectionId] }),
  productIdx: index('product_collections_product_idx').on(table.productId),
  collectionIdx: index('product_collections_collection_idx').on(table.collectionId),
  positionIdx: index('product_collections_position_idx').on(table.position),
}))

// Categories table - Hierarchical product categorization
export const categories = pgTable('categories', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  parentId: text('parent_id').references(() => categories.id, { onDelete: 'cascade' }),
  handle: text('handle').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  image: text('image'),
  
  // Hierarchy helpers
  path: text('path').notNull(), // e.g., "/electronics/phones/smartphones"
  level: integer('level').notNull().default(0), // Depth in tree
  position: integer('position').notNull().default(0), // Order among siblings
  
  // SEO
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  handleIdx: uniqueIndex('categories_handle_idx').on(table.handle),
  parentIdx: index('categories_parent_idx').on(table.parentId),
  pathIdx: index('categories_path_idx').on(table.path),
  levelIdx: index('categories_level_idx').on(table.level),
  activeIdx: index('categories_active_idx').on(table.isActive),
}))

// Product-Category junction table
export const productCategories = pgTable('product_categories', {
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').notNull().default(false), // Main category for the product
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.categoryId] }),
  productIdx: index('product_categories_product_idx').on(table.productId),
  categoryIdx: index('product_categories_category_idx').on(table.categoryId),
  primaryIdx: index('product_categories_primary_idx').on(table.isPrimary),
}))