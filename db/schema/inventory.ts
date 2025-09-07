import { pgTable, text, timestamp, boolean, index, uniqueIndex, integer, decimal } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { productVariants } from './products'

// Inventory locations (warehouses, stores, etc.)
export const inventoryLocations = pgTable('inventory_locations', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  code: text('code').notNull(), // Location code/identifier
  type: text('type').notNull().default('warehouse'), // 'warehouse' | 'store' | 'dropship' | 'supplier'
  
  // Address
  addressLine1: text('address_line_1'),
  addressLine2: text('address_line_2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country').notNull().default('IN'),
  phone: text('phone'),
  email: text('email'),
  
  // Settings
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  fulfillsOnlineOrders: boolean('fulfills_online_orders').notNull().default(true),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  codeIdx: uniqueIndex('inventory_locations_code_idx').on(table.code),
  typeIdx: index('inventory_locations_type_idx').on(table.type),
  activeIdx: index('inventory_locations_active_idx').on(table.isActive),
  defaultIdx: index('inventory_locations_default_idx').on(table.isDefault),
}))

// Stock levels per variant per location
export const stockLevels = pgTable('stock_levels', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  variantId: text('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  locationId: text('location_id').notNull().references(() => inventoryLocations.id, { onDelete: 'cascade' }),
  
  // Quantities
  quantity: integer('quantity').notNull().default(0), // Available quantity
  reservedQuantity: integer('reserved_quantity').notNull().default(0), // Reserved for orders
  incomingQuantity: integer('incoming_quantity').notNull().default(0), // On purchase orders
  
  // Reorder settings
  reorderPoint: integer('reorder_point'), // When to reorder
  reorderQuantity: integer('reorder_quantity'), // How much to reorder
  
  // Cost tracking
  averageCost: integer('average_cost'), // In minor units
  lastCost: integer('last_cost'), // Last purchase cost
  
  // Timestamps
  lastRestockedAt: timestamp('last_restocked_at', { mode: 'date' }),
  lastSoldAt: timestamp('last_sold_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  variantLocationIdx: uniqueIndex('stock_levels_variant_location_idx').on(table.variantId, table.locationId),
  variantIdx: index('stock_levels_variant_idx').on(table.variantId),
  locationIdx: index('stock_levels_location_idx').on(table.locationId),
  quantityIdx: index('stock_levels_quantity_idx').on(table.quantity),
}))

// Inventory adjustments/movements
export const inventoryAdjustments = pgTable('inventory_adjustments', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  variantId: text('variant_id').notNull().references(() => productVariants.id, { onDelete: 'cascade' }),
  locationId: text('location_id').notNull().references(() => inventoryLocations.id, { onDelete: 'cascade' }),
  
  // Adjustment details
  type: text('type').notNull(), // 'received' | 'sold' | 'returned' | 'damaged' | 'lost' | 'correction' | 'transfer'
  quantity: integer('quantity').notNull(), // Positive for additions, negative for removals
  
  // References
  referenceType: text('reference_type'), // 'order' | 'return' | 'transfer' | 'adjustment'
  referenceId: text('reference_id'), // ID of the related entity
  
  // Additional info
  reason: text('reason'),
  notes: text('notes'),
  
  // User tracking
  createdBy: text('created_by'), // User ID who made the adjustment
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  variantIdx: index('inventory_adjustments_variant_idx').on(table.variantId),
  locationIdx: index('inventory_adjustments_location_idx').on(table.locationId),
  typeIdx: index('inventory_adjustments_type_idx').on(table.type),
  referenceIdx: index('inventory_adjustments_reference_idx').on(table.referenceType, table.referenceId),
  createdAtIdx: index('inventory_adjustments_created_idx').on(table.createdAt),
}))