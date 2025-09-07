'use server'

import { db } from '@/lib/db'
import { wishlists, wishlistItems } from '@/db/schema/wishlists'
import { products, productVariants } from '@/db/schema/products'
import { eq, and, desc } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const WISHLIST_SESSION_KEY = 'wishlist_session'

// Get or create session ID for guest wishlists
function getSessionId(): string {
  const cookieStore = cookies()
  let sessionId = cookieStore.get(WISHLIST_SESSION_KEY)?.value
  
  if (!sessionId) {
    sessionId = `wishlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    cookieStore.set(WISHLIST_SESSION_KEY, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    })
  }
  
  return sessionId
}

// Get or create default wishlist for session/customer
async function getOrCreateWishlist(customerId?: string) {
  const sessionId = !customerId ? getSessionId() : null
  
  // Try to find existing default wishlist
  let wishlist = await db.query.wishlists.findFirst({
    where: customerId 
      ? and(eq(wishlists.customerId, customerId), eq(wishlists.isDefault, 'true'))
      : and(eq(wishlists.sessionId, sessionId!), eq(wishlists.isDefault, 'true'))
  })
  
  if (!wishlist) {
    // Create new default wishlist
    const [newWishlist] = await db.insert(wishlists).values({
      customerId,
      sessionId,
      name: 'My Wishlist',
      isDefault: 'true',
      isPublic: 'false'
    }).returning()
    
    wishlist = newWishlist
  }
  
  return wishlist
}

export async function addToWishlist(productId: string, variantId?: string) {
  try {
    // Get product and variant details
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
      with: {
        variants: variantId ? {
          where: eq(productVariants.id, variantId)
        } : true,
        images: {
          orderBy: [desc(productVariants.position)],
          limit: 1
        }
      }
    })
    
    if (!product) {
      return { success: false, error: 'Product not found' }
    }
    
    const variant = variantId 
      ? product.variants.find(v => v.id === variantId)
      : product.variants[0]
    
    if (!variant) {
      return { success: false, error: 'Variant not found' }
    }
    
    // Get or create wishlist
    const wishlist = await getOrCreateWishlist()
    
    // Check if item already exists in wishlist
    const existingItem = await db.query.wishlistItems.findFirst({
      where: and(
        eq(wishlistItems.wishlistId, wishlist.id),
        eq(wishlistItems.productId, productId),
        variantId ? eq(wishlistItems.variantId, variantId) : eq(wishlistItems.variantId, variant.id)
      )
    })
    
    if (existingItem) {
      return { success: false, error: 'Item already in wishlist' }
    }
    
    // Add item to wishlist
    await db.insert(wishlistItems).values({
      wishlistId: wishlist.id,
      productId,
      variantId: variant.id,
      productTitle: product.title,
      productHandle: product.handle,
      productImage: product.images[0]?.url || null,
      variantTitle: variant.title,
      variantImage: variant.image,
      price: variant.price.toString(),
      compareAtPrice: variant.compareAtPrice?.toString()
    })
    
    revalidatePath('/account/wishlist')
    return { success: true }
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return { success: false, error: 'Failed to add item to wishlist' }
  }
}

export async function removeFromWishlist(itemId: string) {
  try {
    await db.delete(wishlistItems)
      .where(eq(wishlistItems.id, itemId))
    
    revalidatePath('/account/wishlist')
    return { success: true }
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    return { success: false, error: 'Failed to remove item from wishlist' }
  }
}

export async function getWishlist(customerId?: string) {
  try {
    const sessionId = !customerId ? getSessionId() : null
    
    const wishlist = await db.query.wishlists.findFirst({
      where: customerId 
        ? and(eq(wishlists.customerId, customerId), eq(wishlists.isDefault, 'true'))
        : and(eq(wishlists.sessionId, sessionId!), eq(wishlists.isDefault, 'true')),
      with: {
        items: {
          orderBy: [desc(wishlistItems.createdAt)]
        }
      }
    })
    
    if (!wishlist) {
      return null
    }
    
    // Transform the data
    const transformedWishlist = {
      ...wishlist,
      items: wishlist.items.map(item => ({
        ...item,
        price: parseInt(item.price),
        compareAtPrice: item.compareAtPrice ? parseInt(item.compareAtPrice) : null
      }))
    }
    
    return transformedWishlist
  } catch (error) {
    console.error('Error getting wishlist:', error)
    return null
  }
}

export async function isInWishlist(productId: string, variantId?: string) {
  try {
    const wishlist = await getOrCreateWishlist()
    
    const item = await db.query.wishlistItems.findFirst({
      where: and(
        eq(wishlistItems.wishlistId, wishlist.id),
        eq(wishlistItems.productId, productId),
        variantId ? eq(wishlistItems.variantId, variantId) : undefined
      )
    })
    
    return !!item
  } catch (error) {
    console.error('Error checking wishlist:', error)
    return false
  }
}

export async function moveToCart(itemId: string) {
  try {
    const item = await db.query.wishlistItems.findFirst({
      where: eq(wishlistItems.id, itemId)
    })
    
    if (!item) {
      return { success: false, error: 'Wishlist item not found' }
    }
    
    // TODO: Add to cart functionality
    // await addToCart(item.variantId!, 1)
    
    // Remove from wishlist
    await removeFromWishlist(itemId)
    
    revalidatePath('/account/wishlist')
    return { success: true }
  } catch (error) {
    console.error('Error moving to cart:', error)
    return { success: false, error: 'Failed to move item to cart' }
  }
}