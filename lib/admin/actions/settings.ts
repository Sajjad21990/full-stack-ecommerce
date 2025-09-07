'use server'

import { db } from '@/db'
import { settings, auditLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function updateSettings(
  prefix: string, 
  settingsData: Record<string, any>
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.transaction(async (tx) => {
      // Update each setting
      for (const [key, value] of Object.entries(settingsData)) {
        if (value !== undefined) {
          const fullKey = `${prefix}_${key}`
          
          await tx.insert(settings)
            .values({
              key: fullKey,
              value: typeof value === 'object' ? JSON.stringify(value) : String(value),
              type: typeof value === 'boolean' ? 'boolean' : 
                    typeof value === 'number' ? 'number' : 
                    Array.isArray(value) ? 'array' : 
                    typeof value === 'object' ? 'object' : 'string'
            })
            .onConflictDoUpdate({
              target: settings.key,
              set: {
                value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                updatedAt: new Date()
              }
            })
        }
      }

      // Log the action
      await tx.insert(auditLogs).values({
        userId: session.user.id,
        action: `update_${prefix}_settings`,
        entity: 'settings',
        entityId: prefix,
        metadata: { 
          settingsCount: Object.keys(settingsData).length,
          settingKeys: Object.keys(settingsData)
        },
        ipAddress: null,
        userAgent: null
      })
    })

    revalidatePath('/admin/settings')

    return { success: true }
  } catch (error) {
    console.error(`Error updating ${prefix} settings:`, error)
    return { success: false, error: error instanceof Error ? error.message : `Failed to update ${prefix} settings` }
  }
}

export async function updateStoreSettings(settingsData: {
  name?: string
  description?: string
  logo?: string
  favicon?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  phone?: string
  email?: string
  website?: string
  timezone?: string
  currency?: string
  locale?: string
  allowGuestCheckout?: boolean
  requireAccountVerification?: boolean
  enableReviews?: boolean
  enableWishlist?: boolean
  enableCompareProducts?: boolean
  maintenanceMode?: boolean
  maintenanceMessage?: string
}) {
  return updateSettings('store', settingsData)
}

export async function updateShippingSettings(settingsData: {
  enableShipping?: boolean
  freeShippingThreshold?: number
  shippingCalculation?: 'flat' | 'weight' | 'price' | 'zone'
  flatRate?: number
  enableLocalDelivery?: boolean
  localDeliveryFee?: number
  localDeliveryRadius?: number
  enableInStorePickup?: boolean
  pickupLocations?: Array<{
    name: string
    address: string
    phone: string
    hours: string
  }>
  enableExpressShipping?: boolean
  expressShippingFee?: number
  processingTime?: number
  shippingZones?: Array<{
    name: string
    countries: string[]
    rates: Array<{
      name: string
      price: number
      estimatedDays: string
    }>
  }>
}) {
  return updateSettings('shipping', settingsData)
}

export async function updateEmailSettings(settingsData: {
  smtpHost?: string
  smtpPort?: number
  smtpUsername?: string
  smtpPassword?: string
  smtpSecure?: boolean
  fromEmail?: string
  fromName?: string
  replyToEmail?: string
  enableOrderConfirmation?: boolean
  enableShippingNotification?: boolean
  enableDeliveryNotification?: boolean
  enableNewsletters?: boolean
  enableMarketingEmails?: boolean
  enableAbandonedCartEmails?: boolean
  abandonedCartDelay?: number
  emailTemplates?: {
    orderConfirmation?: string
    shippingNotification?: string
    deliveryConfirmation?: string
    passwordReset?: string
    welcomeEmail?: string
  }
}) {
  return updateSettings('email', settingsData)
}

export async function updateSEOSettings(settingsData: {
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
  ogTitle?: string
  ogDescription?: string
  ogImage?: string
  twitterCard?: string
  twitterSite?: string
  enableSitemap?: boolean
  enableRobotsTxt?: boolean
  robotsTxtContent?: string
  googleAnalyticsId?: string
  googleTagManagerId?: string
  facebookPixelId?: string
  enableStructuredData?: boolean
  enableCanonicalUrls?: boolean
  defaultImageAlt?: string
  enableImageSEO?: boolean
}) {
  return updateSettings('seo', settingsData)
}

export async function updateTaxSettings(settingsData: {
  enableTax?: boolean
  taxCalculation?: 'exclusive' | 'inclusive'
  defaultTaxRate?: number
  enableTaxByLocation?: boolean
  taxRates?: Array<{
    country: string
    state?: string
    city?: string
    rate: number
    name: string
  }>
  taxExemptRoles?: string[]
  displayTaxInclusive?: boolean
  enableDigitalTax?: boolean
}) {
  return updateSettings('tax', settingsData)
}