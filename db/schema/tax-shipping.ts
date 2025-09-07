import { pgTable, text, timestamp, integer, index, boolean, decimal, primaryKey } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// Tax zones (geographical areas with same tax rules)
export const taxZones = pgTable('tax_zones', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  
  // Default settings
  isDefault: boolean('is_default').notNull().default(false),
  priceIncludesTax: boolean('price_includes_tax').notNull().default(false),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('tax_zones_name_idx').on(table.name),
  defaultIdx: index('tax_zones_default_idx').on(table.isDefault),
}))

// Countries/states included in tax zones
export const taxZoneCountries = pgTable('tax_zone_countries', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  taxZoneId: text('tax_zone_id').notNull().references(() => taxZones.id, { onDelete: 'cascade' }),
  countryCode: text('country_code').notNull(), // ISO country code
  stateCode: text('state_code'), // State/province code (optional)
  includeAllStates: boolean('include_all_states').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  taxZoneIdx: index('tax_zone_countries_zone_idx').on(table.taxZoneId),
  countryIdx: index('tax_zone_countries_country_idx').on(table.countryCode),
}))

// Tax rates
export const taxRates = pgTable('tax_rates', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  taxZoneId: text('tax_zone_id').notNull().references(() => taxZones.id, { onDelete: 'cascade' }),
  
  // Rate details
  name: text('name').notNull(), // e.g., "GST", "VAT", "Sales Tax"
  code: text('code'), // Tax code (HSN/SAC for India)
  rate: integer('rate').notNull(), // Rate in basis points (e.g., 1800 = 18%)
  
  // Compound tax (tax on tax)
  isCompound: boolean('is_compound').notNull().default(false),
  position: integer('position').notNull().default(0), // Order of application
  
  // Product applicability
  includedInPrice: boolean('included_in_price').notNull().default(false),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  taxZoneIdx: index('tax_rates_zone_idx').on(table.taxZoneId),
  codeIdx: index('tax_rates_code_idx').on(table.code),
  rateIdx: index('tax_rates_rate_idx').on(table.rate),
}))

// Shipping zones
export const shippingZones = pgTable('shipping_zones', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  
  // Settings
  isDefault: boolean('is_default').notNull().default(false),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('shipping_zones_name_idx').on(table.name),
  defaultIdx: index('shipping_zones_default_idx').on(table.isDefault),
}))

// Countries/states in shipping zones
export const shippingZoneCountries = pgTable('shipping_zone_countries', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  shippingZoneId: text('shipping_zone_id').notNull().references(() => shippingZones.id, { onDelete: 'cascade' }),
  countryCode: text('country_code').notNull(),
  stateCode: text('state_code'),
  includeAllStates: boolean('include_all_states').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  shippingZoneIdx: index('shipping_zone_countries_zone_idx').on(table.shippingZoneId),
  countryIdx: index('shipping_zone_countries_country_idx').on(table.countryCode),
}))

// Shipping rates/methods
export const shippingRates = pgTable('shipping_rates', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  shippingZoneId: text('shipping_zone_id').notNull().references(() => shippingZones.id, { onDelete: 'cascade' }),
  
  // Rate details
  name: text('name').notNull(), // e.g., "Standard Shipping", "Express"
  description: text('description'),
  code: text('code'), // Internal code
  
  // Pricing
  type: text('type').notNull().default('flat'), // 'flat' | 'calculated' | 'free'
  price: integer('price').notNull().default(0), // In minor units
  
  // Conditions
  minOrderValue: integer('min_order_value'), // Minimum order value for this rate
  maxOrderValue: integer('max_order_value'), // Maximum order value
  minWeight: integer('min_weight'), // Minimum weight in grams
  maxWeight: integer('max_weight'), // Maximum weight in grams
  
  // Delivery time
  minDeliveryDays: integer('min_delivery_days'),
  maxDeliveryDays: integer('max_delivery_days'),
  
  // Settings
  isActive: boolean('is_active').notNull().default(true),
  position: integer('position').notNull().default(0),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  shippingZoneIdx: index('shipping_rates_zone_idx').on(table.shippingZoneId),
  typeIdx: index('shipping_rates_type_idx').on(table.type),
  activeIdx: index('shipping_rates_active_idx').on(table.isActive),
  priceIdx: index('shipping_rates_price_idx').on(table.price),
}))