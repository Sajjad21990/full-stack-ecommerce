import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// Audit logs for tracking admin actions
export const auditLogs = pgTable('audit_logs', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),

  // User who performed the action
  userId: text('user_id').notNull(), // References users.id
  userEmail: text('user_email').notNull(),
  userName: text('user_name'),
  userRole: text('user_role'),

  // Action details
  action: text('action').notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', etc.
  resourceType: text('resource_type').notNull(), // 'product', 'order', 'customer', 'media', etc.
  resourceId: text('resource_id'), // ID of the affected resource
  resourceTitle: text('resource_title'), // Human-readable title/name of the resource

  // Change details
  changes: jsonb('changes'), // { before: {...}, after: {...} } for updates
  metadata: jsonb('metadata'), // Additional context like filters used, bulk operation details, etc.

  // Request context
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  requestId: text('request_id'), // For correlating related actions

  // Result
  status: text('status').notNull().default('success'), // 'success', 'error', 'partial'
  errorMessage: text('error_message'), // Error details if status is 'error'

  // Timestamps
  timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),

  // Duration (for performance tracking)
  duration: text('duration'), // How long the action took
}, (table) => ({
  userIdx: index('audit_logs_user_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceIdx: index('audit_logs_resource_idx').on(table.resourceType, table.resourceId),
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
  statusIdx: index('audit_logs_status_idx').on(table.status),
  ipIdx: index('audit_logs_ip_idx').on(table.ipAddress),
}))

// Audit log entries for bulk operations
export const auditLogBulkOperations = pgTable('audit_log_bulk_operations', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),

  // Reference to the main audit log entry
  auditLogId: text('audit_log_id').notNull().references(() => auditLogs.id, { onDelete: 'cascade' }),

  // Individual item in the bulk operation
  resourceId: text('resource_id').notNull(),
  resourceTitle: text('resource_title'),
  status: text('status').notNull(), // 'success', 'error', 'skipped'
  errorMessage: text('error_message'),
  changes: jsonb('changes'), // Changes for this specific item

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  auditLogIdx: index('audit_log_bulk_audit_log_idx').on(table.auditLogId),
  resourceIdx: index('audit_log_bulk_resource_idx').on(table.resourceId),
  statusIdx: index('audit_log_bulk_status_idx').on(table.status),
}))

// Session tracking for security
export const userSessions = pgTable('user_sessions', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),

  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),

  // Session details
  sessionToken: text('session_token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  // Location data (optional)
  country: text('country'),
  city: text('city'),

  // Status
  status: text('status').notNull().default('active'), // 'active', 'expired', 'terminated'

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { mode: 'date' }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  terminatedAt: timestamp('terminated_at', { mode: 'date' }),
}, (table) => ({
  userIdx: index('user_sessions_user_idx').on(table.userId),
  tokenIdx: index('user_sessions_token_idx').on(table.sessionToken),
  statusIdx: index('user_sessions_status_idx').on(table.status),
  activeIdx: index('user_sessions_active_idx').on(table.lastActiveAt),
}))