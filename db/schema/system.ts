import { pgTable, text, timestamp, integer, index, boolean, jsonb } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'

// Webhooks for external integrations
export const webhooks = pgTable('webhooks', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Webhook details
  url: text('url').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  
  // Events to listen for
  events: text('events').array().notNull(), // e.g., ['order.created', 'product.updated']
  
  // Authentication
  secret: text('secret'), // For HMAC signature verification
  
  // Headers to send
  headers: jsonb('headers'), // Additional HTTP headers
  
  // Settings
  isActive: boolean('is_active').notNull().default(true),
  maxRetries: integer('max_retries').notNull().default(3),
  timeoutSeconds: integer('timeout_seconds').notNull().default(30),
  
  // Statistics
  totalDeliveries: integer('total_deliveries').notNull().default(0),
  successfulDeliveries: integer('successful_deliveries').notNull().default(0),
  failedDeliveries: integer('failed_deliveries').notNull().default(0),
  lastDeliveryAt: timestamp('last_delivery_at', { mode: 'date' }),
  lastSuccessAt: timestamp('last_success_at', { mode: 'date' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  activeIdx: index('webhooks_active_idx').on(table.isActive),
  eventsIdx: index('webhooks_events_idx').on(table.events),
  lastDeliveryIdx: index('webhooks_last_delivery_idx').on(table.lastDeliveryAt),
}))

// Webhook deliveries (tracking individual webhook calls)
export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  webhookId: text('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
  
  // Event details
  eventType: text('event_type').notNull(),
  eventId: text('event_id').notNull(), // ID of the event that triggered this
  
  // Request details
  url: text('url').notNull(),
  httpMethod: text('http_method').notNull().default('POST'),
  headers: jsonb('headers'),
  payload: jsonb('payload').notNull(),
  
  // Response details
  statusCode: integer('status_code'),
  responseHeaders: jsonb('response_headers'),
  responseBody: text('response_body'),
  
  // Delivery status
  status: text('status').notNull().default('pending'), // 'pending' | 'success' | 'failed' | 'cancelled'
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at', { mode: 'date' }),
  nextRetryAt: timestamp('next_retry_at', { mode: 'date' }),
  
  // Error details
  errorMessage: text('error_message'),
  errorCode: text('error_code'),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { mode: 'date' }),
}, (table) => ({
  webhookIdx: index('webhook_deliveries_webhook_idx').on(table.webhookId),
  statusIdx: index('webhook_deliveries_status_idx').on(table.status),
  eventTypeIdx: index('webhook_deliveries_event_type_idx').on(table.eventType),
  nextRetryIdx: index('webhook_deliveries_next_retry_idx').on(table.nextRetryAt),
  createdIdx: index('webhook_deliveries_created_idx').on(table.createdAt),
}))

// System settings/configuration
export const settings = pgTable('settings', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Setting details
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  type: text('type').notNull().default('string'), // 'string' | 'number' | 'boolean' | 'array' | 'object'
  
  // Metadata
  category: text('category'), // 'store' | 'shipping' | 'email' | 'seo' | 'tax' | 'payment'
  description: text('description'),
  isSecret: boolean('is_secret').notNull().default(false), // For sensitive data
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  keyIdx: index('settings_key_idx').on(table.key),
  categoryIdx: index('settings_category_idx').on(table.category),
  typeIdx: index('settings_type_idx').on(table.type),
}))

// System notifications
export const notifications = pgTable('notifications', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Recipient
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  
  // Notification details
  type: text('type').notNull(), // 'info' | 'warning' | 'error' | 'success'
  title: text('title').notNull(),
  message: text('message').notNull(),
  
  // Related entity
  entityType: text('entity_type'), // 'order' | 'product' | 'customer'
  entityId: text('entity_id'),
  
  // Action URL
  actionUrl: text('action_url'),
  actionLabel: text('action_label'),
  
  // Status
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { mode: 'date' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { mode: 'date' }), // When notification expires
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  typeIdx: index('notifications_type_idx').on(table.type),
  readIdx: index('notifications_read_idx').on(table.isRead),
  entityIdx: index('notifications_entity_idx').on(table.entityType, table.entityId),
  createdIdx: index('notifications_created_idx').on(table.createdAt),
  expiresIdx: index('notifications_expires_idx').on(table.expiresAt),
}))