import { pgTable, text, timestamp, boolean, index, uniqueIndex, integer } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'

// Customers table - Extended user information for customers
export const customers = pgTable('customers', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Denormalized user fields for easier querying
  email: text('email').notNull(),
  name: text('name'),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'blocked'
  
  // Customer-specific fields
  phone: text('phone'),
  dateOfBirth: timestamp('date_of_birth', { mode: 'date' }),
  acceptsMarketing: boolean('accepts_marketing').notNull().default(false),
  notes: text('notes'), // Internal notes about the customer
  tags: text('tags').array(), // Customer tags for segmentation
  totalSpent: integer('total_spent').notNull().default(0), // In minor units (cents/paise)
  totalOrders: integer('total_orders').notNull().default(0),
  lastOrderDate: timestamp('last_order_date', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  userIdx: uniqueIndex('customers_user_idx').on(table.userId),
  emailIdx: uniqueIndex('customers_email_idx').on(table.email),
  nameIdx: index('customers_name_idx').on(table.name),
  statusIdx: index('customers_status_idx').on(table.status),
  phoneIdx: index('customers_phone_idx').on(table.phone),
  tagsIdx: index('customers_tags_idx').on(table.tags),
}))

// Addresses table - Can be used for both shipping and billing
export const addresses = pgTable('addresses', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  type: text('type').notNull().default('shipping'), // 'shipping' | 'billing' | 'both'
  isDefault: boolean('is_default').notNull().default(false),
  
  // Address fields
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  company: text('company'),
  addressLine1: text('address_line_1').notNull(),
  addressLine2: text('address_line_2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').notNull().default('IN'), // ISO country code
  phone: text('phone'),
  
  // Metadata
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  customerIdx: index('addresses_customer_idx').on(table.customerId),
  typeIdx: index('addresses_type_idx').on(table.type),
  defaultIdx: index('addresses_default_idx').on(table.isDefault),
}))

// Customer Groups table - For customer segmentation
export const customerGroups = pgTable('customer_groups', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#3B82F6'), // Hex color for UI
  isActive: boolean('is_active').notNull().default(true),
  
  // Auto-assignment rules (JSON stored as text)
  rules: text('rules'), // JSON string with conditions
  
  // Metadata
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  nameIdx: uniqueIndex('customer_groups_name_idx').on(table.name),
  activeIdx: index('customer_groups_active_idx').on(table.isActive),
}))

// Customer Group Memberships - Many-to-many relationship
export const customerGroupMembers = pgTable('customer_group_members', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  customerId: text('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => customerGroups.id, { onDelete: 'cascade' }),
  
  // Membership metadata
  addedAt: timestamp('added_at', { mode: 'date' }).notNull().defaultNow(),
  addedBy: text('added_by'), // User ID who added them
  isAutoAssigned: boolean('is_auto_assigned').notNull().default(false),
}, (table) => ({
  customerGroupIdx: uniqueIndex('customer_group_members_customer_group_idx').on(table.customerId, table.groupId),
  customerIdx: index('customer_group_members_customer_idx').on(table.customerId),
  groupIdx: index('customer_group_members_group_idx').on(table.groupId),
}))