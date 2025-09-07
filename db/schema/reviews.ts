import { pgTable, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'
import { products } from './products'
import { customers } from './customers'
import { orders } from './orders'

// Product reviews
export const reviews = pgTable('reviews', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'set null' }),
  
  // Review content
  title: text('title'),
  content: text('content').notNull(),
  rating: integer('rating').notNull(), // 1-5 stars
  
  // Customer info (denormalized for display)
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  
  // Verification
  verified: boolean('verified').notNull().default(false), // If purchased
  
  // Helpfulness voting
  helpfulCount: integer('helpful_count').notNull().default(0),
  notHelpfulCount: integer('not_helpful_count').notNull().default(0),
  
  // Moderation
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected' | 'hidden'
  moderatedBy: text('moderated_by'),
  moderatedAt: timestamp('moderated_at', { mode: 'date' }),
  moderationNotes: text('moderation_notes'),
  
  // Response from merchant
  merchantReply: text('merchant_reply'),
  merchantRepliedAt: timestamp('merchant_replied_at', { mode: 'date' }),
  merchantRepliedBy: text('merchant_replied_by'),
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  productIdx: index('reviews_product_idx').on(table.productId),
  customerIdx: index('reviews_customer_idx').on(table.customerId),
  statusIdx: index('reviews_status_idx').on(table.status),
  ratingIdx: index('reviews_rating_idx').on(table.rating),
  verifiedIdx: index('reviews_verified_idx').on(table.verified),
  createdIdx: index('reviews_created_idx').on(table.createdAt),
}))

// Review images/media
export const reviewMedia = pgTable('review_media', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  reviewId: text('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  
  // Media details
  type: text('type').notNull(), // 'image' | 'video'
  url: text('url').notNull(),
  altText: text('alt_text'),
  
  // Dimensions (for images)
  width: integer('width'),
  height: integer('height'),
  
  // Order
  position: integer('position').notNull().default(0),
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  reviewIdx: index('review_media_review_idx').on(table.reviewId),
  positionIdx: index('review_media_position_idx').on(table.position),
}))

// Review helpfulness votes
export const reviewVotes = pgTable('review_votes', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  reviewId: text('review_id').notNull().references(() => reviews.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  
  // Vote details
  helpful: boolean('helpful').notNull(), // true = helpful, false = not helpful
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  reviewIdx: index('review_votes_review_idx').on(table.reviewId),
  customerIdx: index('review_votes_customer_idx').on(table.customerId),
}))

// Review summary/aggregations (for performance)
export const reviewSummaries = pgTable('review_summaries', {
  productId: text('product_id').notNull().primaryKey().references(() => products.id, { onDelete: 'cascade' }),
  
  // Counts
  totalReviews: integer('total_reviews').notNull().default(0),
  verifiedReviews: integer('verified_reviews').notNull().default(0),
  
  // Ratings breakdown
  averageRating: integer('average_rating').notNull().default(0), // Stored as integer (rating * 100)
  rating5Count: integer('rating_5_count').notNull().default(0),
  rating4Count: integer('rating_4_count').notNull().default(0),
  rating3Count: integer('rating_3_count').notNull().default(0),
  rating2Count: integer('rating_2_count').notNull().default(0),
  rating1Count: integer('rating_1_count').notNull().default(0),
  
  // Last update
  lastReviewAt: timestamp('last_review_at', { mode: 'date' }),
  
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  avgRatingIdx: index('review_summaries_avg_rating_idx').on(table.averageRating),
  totalReviewsIdx: index('review_summaries_total_idx').on(table.totalReviews),
}))