import { pgTable, text, timestamp, integer, index, boolean, jsonb } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// Media assets (images, videos, documents)
export const mediaAssets = pgTable('media_assets', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // File details
  fileName: text('file_name').notNull(),
  originalFileName: text('original_file_name'),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(), // File size in bytes
  
  // URLs
  url: text('url').notNull(), // Main URL
  thumbnailUrl: text('thumbnail_url'), // Thumbnail URL
  
  // Image specific
  width: integer('width'),
  height: integer('height'),
  altText: text('alt_text'),
  
  // Storage
  storageProvider: text('storage_provider').notNull().default('firebase'), // 'firebase' | 'aws' | 'local'
  storagePath: text('storage_path').notNull(),
  storageKey: text('storage_key'),
  
  // Organization
  folder: text('folder'), // Folder/directory
  tags: text('tags').array(),
  
  // Status
  status: text('status').notNull().default('active'), // 'active' | 'archived' | 'deleted'
  
  // Usage tracking
  usageCount: integer('usage_count').notNull().default(0),
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
  
  // SEO
  title: text('title'),
  description: text('description'),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  fileNameIdx: index('media_assets_filename_idx').on(table.fileName),
  mimeTypeIdx: index('media_assets_mimetype_idx').on(table.mimeType),
  statusIdx: index('media_assets_status_idx').on(table.status),
  folderIdx: index('media_assets_folder_idx').on(table.folder),
  tagsIdx: index('media_assets_tags_idx').on(table.tags),
  usageIdx: index('media_assets_usage_idx').on(table.usageCount),
}))

// Media associations (link media to products, collections, etc.)
export const mediaAssociations = pgTable('media_associations', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  mediaAssetId: text('media_asset_id').notNull().references(() => mediaAssets.id, { onDelete: 'cascade' }),
  
  // Associated entity
  entityType: text('entity_type').notNull(), // 'product' | 'product_variant' | 'collection' | 'category' | 'page'
  entityId: text('entity_id').notNull(),
  
  // Association details
  type: text('type').notNull().default('image'), // 'image' | 'gallery' | 'thumbnail' | 'hero' | 'attachment'
  position: integer('position').notNull().default(0),
  isPrimary: boolean('is_primary').notNull().default(false),
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  mediaIdx: index('media_associations_media_idx').on(table.mediaAssetId),
  entityIdx: index('media_associations_entity_idx').on(table.entityType, table.entityId),
  typeIdx: index('media_associations_type_idx').on(table.type),
  primaryIdx: index('media_associations_primary_idx').on(table.isPrimary),
}))

// Metafields (custom fields for extensibility)
export const metafields = pgTable('metafields', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Owner entity
  ownerType: text('owner_type').notNull(), // 'product' | 'product_variant' | 'customer' | 'order' | 'collection'
  ownerId: text('owner_id').notNull(),
  
  // Field definition
  namespace: text('namespace').notNull(), // Grouping/namespace for the field
  key: text('key').notNull(), // Field key
  
  // Value
  value: text('value'), // String value
  valueType: text('value_type').notNull().default('string'), // 'string' | 'integer' | 'boolean' | 'json' | 'date'
  jsonValue: jsonb('json_value'), // For complex data
  intValue: integer('int_value'), // For integer values
  boolValue: boolean('bool_value'), // For boolean values
  dateValue: timestamp('date_value', { mode: 'date' }), // For date values
  
  // Metadata
  description: text('description'),
  isPublic: boolean('is_public').notNull().default(false), // Whether visible to customers
  
  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index('metafields_owner_idx').on(table.ownerType, table.ownerId),
  namespaceKeyIdx: index('metafields_namespace_key_idx').on(table.namespace, table.key),
  publicIdx: index('metafields_public_idx').on(table.isPublic),
  valueTypeIdx: index('metafields_value_type_idx').on(table.valueType),
}))