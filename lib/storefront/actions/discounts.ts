'use server'

import { db } from '@/lib/db'
import { discounts, discountUsages, discountProducts, discountCollections } from '@/db/schema/discounts'
import { productCollections } from '@/db/schema/collections'
import { eq, and, or, lte, gte, isNull, inArray } from 'drizzle-orm'
import { Cart } from '@/lib/storefront/queries/cart'

export interface DiscountValidationResult {
  valid: boolean
  discount?: any
  error?: string
  discountAmount?: number
}

export interface AppliedDiscount {
  id: string
  code: string
  title: string
  type: string
  discountAmount: number
}

// Validate and apply discount code
export async function validateDiscountCode(code: string, cart: Cart): Promise<DiscountValidationResult> {
  try {
    if (!code.trim()) {
      return { valid: false, error: 'Please enter a discount code' }
    }

    // Find active discount by code
    const discount = await db.query.discounts.findFirst({
      where: and(
        eq(discounts.code, code.toUpperCase()),
        eq(discounts.status, 'active'),
        or(
          isNull(discounts.startsAt),
          lte(discounts.startsAt, new Date())
        ),
        or(
          isNull(discounts.endsAt),
          gte(discounts.endsAt, new Date())
        )
      )
    })

    if (!discount) {
      return { valid: false, error: 'Invalid or expired discount code' }
    }

    // Check usage limits
    if (discount.usageLimit && discount.currentUsage >= discount.usageLimit) {
      return { valid: false, error: 'This discount code has reached its usage limit' }
    }

    // Check minimum amount
    const cartTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    if (discount.minimumAmount && cartTotal < discount.minimumAmount) {
      return { 
        valid: false, 
        error: `Minimum order amount of ₹${discount.minimumAmount / 100} required` 
      }
    }

    // Calculate discount amount
    const discountAmount = await calculateDiscountAmount(discount, cart)
    
    if (discountAmount <= 0) {
      return { valid: false, error: 'This discount is not applicable to your current cart' }
    }

    return {
      valid: true,
      discount,
      discountAmount
    }
  } catch (error) {
    console.error('Error validating discount code:', error)
    return { valid: false, error: 'Failed to validate discount code' }
  }
}

// Calculate discount amount based on discount type and cart contents
async function calculateDiscountAmount(discount: any, cart: Cart): Promise<number> {
  const cartTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  switch (discount.type) {
    case 'percentage':
      const percentageDiscount = Math.floor((cartTotal * discount.value) / 10000) // value is in basis points
      return discount.maximumAmount 
        ? Math.min(percentageDiscount, discount.maximumAmount)
        : percentageDiscount

    case 'fixed_amount':
      return Math.min(discount.value, cartTotal) // Can't discount more than cart total

    case 'free_shipping':
      // Return shipping cost as discount (would need shipping calculation)
      return 150 // Assuming ₹150 shipping cost

    case 'buy_x_get_y':
      if (!discount.prerequisiteQuantity || !discount.entitledQuantity) return 0
      
      // Check if we have enough items to qualify
      const eligibleItems = await getEligibleCartItems(discount, cart)
      const eligibleQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0)
      
      if (eligibleQuantity < discount.prerequisiteQuantity) return 0
      
      // Calculate how many free items customer gets
      const freeItemSets = Math.floor(eligibleQuantity / discount.prerequisiteQuantity)
      const freeItems = freeItemSets * discount.entitledQuantity
      
      // Find cheapest eligible items to discount
      const sortedItems = eligibleItems
        .flatMap(item => Array(item.quantity).fill(item))
        .sort((a, b) => a.price - b.price)
        .slice(0, freeItems)
      
      return sortedItems.reduce((sum, item) => sum + item.price, 0)

    default:
      return 0
  }
}

// Get cart items eligible for discount based on product/collection restrictions
async function getEligibleCartItems(discount: any, cart: Cart) {
  if (discount.appliesToType === 'all') {
    return cart.items
  }

  let eligibleProductIds: string[] = []

  if (discount.appliesToType === 'products') {
    // Get products directly associated with discount
    const discountProducts = await db.query.discountProducts.findMany({
      where: eq(discountProducts.discountId, discount.id)
    })
    eligibleProductIds = discountProducts.map(dp => dp.productId)
  }

  if (discount.appliesToType === 'collections') {
    // Get products from collections associated with discount
    const discountCollections = await db.query.discountCollections.findMany({
      where: eq(discountCollections.discountId, discount.id)
    })
    
    if (discountCollections.length > 0) {
      const collectionIds = discountCollections.map(dc => dc.collectionId)
      
      // Get products in these collections
      const productsInCollections = await db.query.collectionProducts.findMany({
        where: inArray(collectionProducts.collectionId, collectionIds)
      })
      
      const collectionProductIds = productsInCollections.map(cp => cp.productId)
      eligibleProductIds = [...new Set([...eligibleProductIds, ...collectionProductIds])]
    }
  }

  // Filter cart items to only eligible products
  return cart.items.filter(item => 
    eligibleProductIds.length === 0 || eligibleProductIds.includes(item.productId)
  )
}

// Get available discount codes for display
export async function getAvailableDiscounts(cartTotal?: number) {
  try {
    const now = new Date()
    
    const availableDiscounts = await db.query.discounts.findMany({
      where: and(
        eq(discounts.status, 'active'),
        or(
          isNull(discounts.startsAt),
          lte(discounts.startsAt, now)
        ),
        or(
          isNull(discounts.endsAt),
          gte(discounts.endsAt, now)
        ),
        // Only show codes that haven't reached their usage limit
        or(
          isNull(discounts.usageLimit),
          lte(discounts.currentUsage, discounts.usageLimit)
        ),
        // Only show codes that meet minimum amount requirement (if cart total provided)
        cartTotal ? or(
          isNull(discounts.minimumAmount),
          lte(discounts.minimumAmount, cartTotal)
        ) : undefined
      ),
      orderBy: [discounts.createdAt],
      limit: 5 // Show top 5 available discounts
    })

    return availableDiscounts.filter(discount => discount.code) // Only show codes with actual codes
  } catch (error) {
    console.error('Error getting available discounts:', error)
    return []
  }
}

// Apply automatic discounts that don't require codes
export async function getAutomaticDiscounts(cart: Cart): Promise<AppliedDiscount[]> {
  try {
    const cartTotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const now = new Date()
    
    // Find automatic discounts (those without codes)
    const automaticDiscounts = await db.query.discounts.findMany({
      where: and(
        eq(discounts.code, ''), // No code required
        eq(discounts.status, 'active'),
        or(
          isNull(discounts.startsAt),
          lte(discounts.startsAt, now)
        ),
        or(
          isNull(discounts.endsAt),
          gte(discounts.endsAt, now)
        ),
        or(
          isNull(discounts.minimumAmount),
          lte(discounts.minimumAmount, cartTotal)
        )
      )
    })

    const appliedDiscounts: AppliedDiscount[] = []

    for (const discount of automaticDiscounts) {
      const discountAmount = await calculateDiscountAmount(discount, cart)
      
      if (discountAmount > 0) {
        appliedDiscounts.push({
          id: discount.id,
          code: discount.code || 'AUTO',
          title: discount.title,
          type: discount.type,
          discountAmount
        })
      }
    }

    return appliedDiscounts
  } catch (error) {
    console.error('Error getting automatic discounts:', error)
    return []
  }
}

// Record discount usage
export async function recordDiscountUsage(
  discountId: string, 
  customerId: string | null, 
  orderId: string, 
  discountAmount: number
) {
  try {
    // Record usage
    await db.insert(discountUsages).values({
      discountId,
      customerId,
      orderId,
      discountAmount
    })

    // Update usage count
    await db.update(discounts)
      .set({ 
        currentUsage: discounts.currentUsage + 1 
      })
      .where(eq(discounts.id, discountId))

    return { success: true }
  } catch (error) {
    console.error('Error recording discount usage:', error)
    return { success: false, error: 'Failed to record discount usage' }
  }
}