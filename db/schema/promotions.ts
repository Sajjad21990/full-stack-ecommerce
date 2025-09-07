import { pgTable, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// Promotional banners and campaigns
export const promotions = pgTable('promotions', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Basic info
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'banner' | 'popup' | 'announcement' | 'toast'
  
  // Display content
  heading: text('heading'),
  subheading: text('subheading'),
  bodyText: text('body_text'),
  buttonText: text('button_text'),
  buttonUrl: text('button_url'),
  
  // Media
  imageUrl: text('image_url'),
  imageAlt: text('image_alt'),
  videoUrl: text('video_url'),
  
  // Design & Layout
  template: text('template').notNull().default('default'), // 'default' | 'hero' | 'sidebar' | 'floating' | 'fullscreen'
  backgroundColor: text('background_color'),
  textColor: text('text_color'),
  buttonColor: text('button_color'),
  
  // Positioning & Display
  placement: text('placement').notNull(), // 'homepage' | 'category' | 'product' | 'cart' | 'checkout' | 'all_pages'
  position: text('position'), // 'top' | 'bottom' | 'sidebar' | 'center' | 'floating'
  priority: integer('priority').notNull().default(0), // Higher number = higher priority
  
  // Targeting
  targetAudience: text('target_audience').notNull().default('all'), // 'all' | 'new_visitors' | 'returning_visitors' | 'logged_in' | 'anonymous'
  targetPages: text('target_pages').array(), // Specific pages to show on
  targetProducts: text('target_products').array(), // Show on specific product pages
  targetCollections: text('target_collections').array(), // Show on specific collection pages
  
  // Scheduling
  startsAt: timestamp('starts_at', { mode: 'date' }),
  endsAt: timestamp('ends_at', { mode: 'date' }),
  
  // Behavior
  dismissible: boolean('dismissible').notNull().default(true),
  showOnce: boolean('show_once').notNull().default(false), // Show only once per visitor
  delaySeconds: integer('delay_seconds').notNull().default(0), // Delay before showing (for popups)
  autoHideSeconds: integer('auto_hide_seconds'), // Auto-hide after N seconds
  
  // Analytics & Tracking
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  
  // Status
  status: text('status').notNull().default('draft'), // 'active' | 'draft' | 'scheduled' | 'paused' | 'expired'
  
  // Metadata
  createdBy: text('created_by'), // User ID who created this
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  typeIdx: index('promotions_type_idx').on(table.type),
  placementIdx: index('promotions_placement_idx').on(table.placement),
  statusIdx: index('promotions_status_idx').on(table.status),
  priorityIdx: index('promotions_priority_idx').on(table.priority),
  startsIdx: index('promotions_starts_idx').on(table.startsAt),
  endsIdx: index('promotions_ends_idx').on(table.endsAt),
}))

// Promotion interactions (clicks, dismissals, etc.)
export const promotionInteractions = pgTable('promotion_interactions', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  promotionId: text('promotion_id').notNull().references(() => promotions.id, { onDelete: 'cascade' }),
  
  // User identification
  sessionId: text('session_id'),
  customerId: text('customer_id'),
  
  // Interaction details
  type: text('type').notNull(), // 'view' | 'click' | 'dismiss' | 'close'
  page: text('page'), // Page where interaction occurred
  referrer: text('referrer'),
  
  // Technical details
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  promotionIdx: index('promotion_interactions_promotion_idx').on(table.promotionId),
  typeIdx: index('promotion_interactions_type_idx').on(table.type),
  sessionIdx: index('promotion_interactions_session_idx').on(table.sessionId),
  customerIdx: index('promotion_interactions_customer_idx').on(table.customerId),
  createdIdx: index('promotion_interactions_created_idx').on(table.createdAt),
}))

// Email campaigns
export const emailCampaigns = pgTable('email_campaigns', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Campaign details
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  preheader: text('preheader'), // Preview text
  
  // Content
  templateId: text('template_id'),
  htmlContent: text('html_content'),
  textContent: text('text_content'),
  
  // Sender info
  fromName: text('from_name').notNull(),
  fromEmail: text('from_email').notNull(),
  replyTo: text('reply_to'),
  
  // Campaign type
  type: text('type').notNull(), // 'newsletter' | 'promotional' | 'transactional' | 'automated'
  trigger: text('trigger'), // For automated campaigns: 'welcome' | 'cart_abandonment' | 'order_followup'
  
  // Scheduling
  scheduledAt: timestamp('scheduled_at', { mode: 'date' }),
  sentAt: timestamp('sent_at', { mode: 'date' }),
  
  // Targeting
  audienceType: text('audience_type').notNull(), // 'all_subscribers' | 'segments' | 'custom'
  audienceSegments: text('audience_segments').array(), // Customer segments
  audienceFilters: jsonb('audience_filters'), // Custom filters
  
  // Statistics
  totalRecipients: integer('total_recipients').notNull().default(0),
  delivered: integer('delivered').notNull().default(0),
  opened: integer('opened').notNull().default(0),
  clicked: integer('clicked').notNull().default(0),
  unsubscribed: integer('unsubscribed').notNull().default(0),
  bounced: integer('bounced').notNull().default(0),
  
  // Status
  status: text('status').notNull().default('draft'), // 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
  
  createdBy: text('created_by'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  typeIdx: index('email_campaigns_type_idx').on(table.type),
  statusIdx: index('email_campaigns_status_idx').on(table.status),
  scheduledIdx: index('email_campaigns_scheduled_idx').on(table.scheduledAt),
  sentIdx: index('email_campaigns_sent_idx').on(table.sentAt),
}))

// Email subscribers and preferences
export const emailSubscribers = pgTable('email_subscribers', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  
  // Subscriber info
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  customerId: text('customer_id'), // Link to customer if they have an account
  
  // Subscription status
  status: text('status').notNull().default('subscribed'), // 'subscribed' | 'unsubscribed' | 'bounced' | 'complained'
  
  // Preferences
  preferences: jsonb('preferences'), // Which types of emails they want
  
  // Subscription details
  source: text('source').notNull().default('website'), // 'website' | 'checkout' | 'import' | 'api'
  subscribedAt: timestamp('subscribed_at', { mode: 'date' }).notNull().defaultNow(),
  unsubscribedAt: timestamp('unsubscribed_at', { mode: 'date' }),
  
  // Double opt-in
  confirmed: boolean('confirmed').notNull().default(false),
  confirmationToken: text('confirmation_token'),
  confirmedAt: timestamp('confirmed_at', { mode: 'date' }),
  
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('email_subscribers_email_idx').on(table.email),
  statusIdx: index('email_subscribers_status_idx').on(table.status),
  customerIdx: index('email_subscribers_customer_idx').on(table.customerId),
  confirmedIdx: index('email_subscribers_confirmed_idx').on(table.confirmed),
}))