import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

export const mediaFolders = pgTable('media_folders', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  path: text('path').notNull().unique(), // Full path like "products/shoes" or "root"
  parentId: text('parent_id').references(() => mediaFolders.id, {
    onDelete: 'cascade',
  }),
  depth: text('depth').notNull().default('0'), // For efficient nested queries
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
