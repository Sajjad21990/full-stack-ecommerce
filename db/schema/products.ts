import { pgTable, text, timestamp, boolean, index, uniqueIndex, integer, jsonb, decimal } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

// Products table - Main product information
export const products = pgTable('products', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  handle: text('handle').notNull(), // URL-friendly slug
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('draft'), // 'active' | 'draft' | 'archived'
  
  // SEO
  metaTitle: text('meta_title'),
  metaDescription: text('meta_description'),
  
  // Organization
  vendor: text('vendor'),
  productType: text('product_type'),
  tags: text('tags').array(),
  
  // Pricing (base prices, can be overridden by variants)
  price: integer('price').notNull().default(0), // In minor units
  compareAtPrice: integer('compare_at_price'), // Original price for sales
  costPerItem: integer('cost_per_item'), // Cost for profit calculations
  
  // Weight and dimensions (for shipping)
  weight: integer('weight'), // In grams
  weightUnit: text('weight_unit').notNull().default('g'), // 'g' | 'kg' | 'lb' | 'oz'
  
  // Tax
  taxable: boolean('taxable').notNull().default(true),
  taxCode: text('tax_code'), // HSN/SAC code for India
  
  // Inventory
  requiresShipping: boolean('requires_shipping').notNull().default(true),
  trackInventory: boolean('track_inventory').notNull().default(true),
  continueSellingWhenOutOfStock: boolean('continue_selling').notNull().default(false),
  
  // Timestamps
  publishedAt: timestamp('published_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  handleIdx: uniqueIndex('products_handle_idx').on(table.handle),
  statusIdx: index('products_status_idx').on(table.status),
  vendorIdx: index('products_vendor_idx').on(table.vendor),
  typeIdx: index('products_type_idx').on(table.productType),
  tagsIdx: index('products_tags_idx').on(table.tags),
  publishedIdx: index('products_published_idx').on(table.publishedAt),
}))

// Product options (e.g., Size, Color)
export const productOptions = pgTable('product_options', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Size", "Color"
  position: integer('position').notNull().default(0), // Display order
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  productIdx: index('product_options_product_idx').on(table.productId),
  positionIdx: index('product_options_position_idx').on(table.position),
}))

// Option values (e.g., Small, Medium, Large for Size)
export const optionValues = pgTable('option_values', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  optionId: text('option_id').notNull().references(() => productOptions.id, { onDelete: 'cascade' }),
  value: text('value').notNull(), // e.g., "Small", "Red"
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  optionIdx: index('option_values_option_idx').on(table.optionId),
  valueIdx: index('option_values_value_idx').on(table.value),
}))

// Product variants (combinations of options)
export const productVariants = pgTable('product_variants', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  
  // Variant specific info
  title: text('title').notNull(), // e.g., "Small / Red"
  sku: text('sku'),
  barcode: text('barcode'),
  position: integer('position').notNull().default(0),
  
  // Option values for this variant
  option1: text('option_1'), // Value for first option
  option2: text('option_2'), // Value for second option
  option3: text('option_3'), // Value for third option
  
  // Pricing
  price: integer('price').notNull(), // Variant price in minor units
  compareAtPrice: integer('compare_at_price'),
  costPerItem: integer('cost_per_item'),
  
  // Weight (for shipping)
  weight: integer('weight'), // In grams
  weightUnit: text('weight_unit').notNull().default('g'),
  
  // Inventory
  inventoryQuantity: integer('inventory_quantity').notNull().default(0),
  inventoryPolicy: text('inventory_policy').notNull().default('deny'), // 'deny' | 'continue'
  
  // Tax
  taxable: boolean('taxable').notNull().default(true),
  taxCode: text('tax_code'),
  
  // Fulfillment
  requiresShipping: boolean('requires_shipping').notNull().default(true),
  fulfillmentService: text('fulfillment_service').notNull().default('manual'),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  productIdx: index('product_variants_product_idx').on(table.productId),
  skuIdx: uniqueIndex('product_variants_sku_idx').on(table.sku),
  barcodeIdx: index('product_variants_barcode_idx').on(table.barcode),
  inventoryIdx: index('product_variants_inventory_idx').on(table.inventoryQuantity),
}))

// Product images
export const productImages = pgTable('product_images', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  altText: text('alt_text'),
  position: integer('position').notNull().default(0),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  productIdx: index('product_images_product_idx').on(table.productId),
  positionIdx: index('product_images_position_idx').on(table.position),
}))

// Relations
export const productsRelations = relations(products, ({ many }) => ({
  options: many(productOptions),
  variants: many(productVariants),
  images: many(productImages),
}))

export const productOptionsRelations = relations(productOptions, ({ one, many }) => ({
  product: one(products, {
    fields: [productOptions.productId],
    references: [products.id],
  }),
  values: many(optionValues),
}))

export const optionValuesRelations = relations(optionValues, ({ one }) => ({
  option: one(productOptions, {
    fields: [optionValues.optionId],
    references: [productOptions.id],
  }),
}))

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}))

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}))