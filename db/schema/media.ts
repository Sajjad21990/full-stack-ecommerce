import { pgTable, text, timestamp, integer, boolean, index, jsonb } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { users } from './auth'

// Media/Files table for centralized file management
export const media = pgTable('media', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // File information
  filename: text('filename').notNull(), // Original filename
  name: text('name').notNull(), // Display name (editable)
  description: text('description'),
  alt: text('alt'), // Alt text for accessibility
  
  // File details
  url: text('url').notNull(), // Full URL to the file
  publicId: text('public_id'), // For cloud storage (Cloudinary, AWS S3, etc.)
  key: text('key'), // Storage key/path
  
  // File metadata
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // File size in bytes
  width: integer('width'), // For images
  height: integer('height'), // For images
  duration: integer('duration'), // For videos (in seconds)
  
  // Storage information
  provider: text('provider').notNull().default('local'), // 'local' | 'cloudinary' | 's3' | 'firebase'
  bucket: text('bucket'), // Storage bucket name
  folder: text('folder'), // Folder/directory path
  
  // Organization
  tags: text('tags').array(), // Tags for organization
  collections: text('collections').array(), // Media collections/albums
  
  // SEO & Meta
  caption: text('caption'),
  credit: text('credit'), // Photo credit
  copyright: text('copyright'),
  
  // Processing status
  status: text('status').notNull().default('processing'), // 'processing' | 'ready' | 'failed' | 'deleted'
  processedVariants: jsonb('processed_variants'), // Different sizes/formats generated
  
  // Usage tracking
  usageCount: integer('usage_count').notNull().default(0), // How many times used
  lastUsed: timestamp('last_used', { mode: 'date' }),
  
  // User tracking
  uploadedBy: text('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  filenameIdx: index('media_filename_idx').on(table.filename),
  mimeTypeIdx: index('media_mime_type_idx').on(table.mimeType),
  statusIdx: index('media_status_idx').on(table.status),
  providerIdx: index('media_provider_idx').on(table.provider),
  uploadedByIdx: index('media_uploaded_by_idx').on(table.uploadedBy),
  tagsIdx: index('media_tags_idx').on(table.tags),
  createdIdx: index('media_created_idx').on(table.createdAt),
  usageIdx: index('media_usage_idx').on(table.usageCount),
}))

// Media collections for organizing files
export const mediaCollections = pgTable('media_collections', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Collection details
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  
  // Organization
  parentId: text('parent_id').references(() => mediaCollections.id, { onDelete: 'set null' }),
  position: integer('position').notNull().default(0),
  
  // Settings
  isPublic: boolean('is_public').notNull().default(false),
  allowedTypes: text('allowed_types').array(), // Restrict file types
  maxFileSize: integer('max_file_size'), // Max file size in bytes
  
  // Metadata
  thumbnailId: text('thumbnail_id').references(() => media.id, { onDelete: 'set null' }),
  color: text('color'), // Collection color theme
  
  // User tracking
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  
  // Stats
  mediaCount: integer('media_count').notNull().default(0),
  totalSize: integer('total_size').notNull().default(0), // Total size of all media
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: index('media_collections_slug_idx').on(table.slug),
  parentIdx: index('media_collections_parent_idx').on(table.parentId),
  positionIdx: index('media_collections_position_idx').on(table.position),
  createdByIdx: index('media_collections_created_by_idx').on(table.createdBy),
}))

// Media usage tracking - where media files are used
export const mediaUsage = pgTable('media_usage', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Relations
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  
  // Usage context
  entityType: text('entity_type').notNull(), // 'product' | 'collection' | 'article' | 'page' | 'email'
  entityId: text('entity_id').notNull(), // ID of the entity using this media
  
  // Usage details
  context: text('context'), // How it's used: 'featured_image' | 'gallery' | 'thumbnail' | 'content'
  position: integer('position'), // Position in gallery/list
  
  // Metadata
  metadata: jsonb('metadata'), // Additional context-specific data
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  mediaIdx: index('media_usage_media_idx').on(table.mediaId),
  entityIdx: index('media_usage_entity_idx').on(table.entityType, table.entityId),
  contextIdx: index('media_usage_context_idx').on(table.context),
}))

// Media processing queue for handling uploads and transformations
export const mediaProcessingQueue = pgTable('media_processing_queue', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Media reference
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  
  // Processing details
  operation: text('operation').notNull(), // 'upload' | 'resize' | 'compress' | 'convert' | 'watermark'
  parameters: jsonb('parameters'), // Operation-specific parameters
  priority: integer('priority').notNull().default(0), // Higher = more priority
  
  // Status
  status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'completed' | 'failed'
  progress: integer('progress').notNull().default(0), // 0-100
  
  // Processing metadata
  startedAt: timestamp('started_at', { mode: 'date' }),
  completedAt: timestamp('completed_at', { mode: 'date' }),
  error: text('error'), // Error message if failed
  result: jsonb('result'), // Processing result data
  
  // Retry logic
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  nextRetryAt: timestamp('next_retry_at', { mode: 'date' }),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  mediaIdx: index('media_processing_queue_media_idx').on(table.mediaId),
  statusIdx: index('media_processing_queue_status_idx').on(table.status),
  priorityIdx: index('media_processing_queue_priority_idx').on(table.priority),
  nextRetryIdx: index('media_processing_queue_retry_idx').on(table.nextRetryAt),
}))

// Media variants - different sizes/formats of the same media
export const mediaVariants = pgTable('media_variants', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Parent media reference
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  
  // Variant details
  name: text('name').notNull(), // e.g., 'thumbnail', 'medium', 'large', 'webp'
  url: text('url').notNull(),
  
  // File details
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull(),
  width: integer('width'),
  height: integer('height'),
  quality: integer('quality'), // For compressed variants
  
  // Processing details
  transformation: jsonb('transformation'), // Transformation parameters used
  
  // Status
  status: text('status').notNull().default('processing'), // 'processing' | 'ready' | 'failed'
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  mediaIdx: index('media_variants_media_idx').on(table.mediaId),
  nameIdx: index('media_variants_name_idx').on(table.name),
  statusIdx: index('media_variants_status_idx').on(table.status),
}))

// Media analytics for tracking usage and performance
export const mediaAnalytics = pgTable('media_analytics', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Media reference
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  
  // Analytics data
  date: text('date').notNull(), // YYYY-MM-DD
  views: integer('views').notNull().default(0),
  downloads: integer('downloads').notNull().default(0),
  bandwidth: integer('bandwidth').notNull().default(0), // Bytes transferred
  
  // Geographic data
  country: text('country'),
  city: text('city'),
  
  // Technical data
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  mediaIdx: index('media_analytics_media_idx').on(table.mediaId),
  dateIdx: index('media_analytics_date_idx').on(table.date),
  countryIdx: index('media_analytics_country_idx').on(table.country),
}))