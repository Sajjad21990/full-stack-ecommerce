'use server'

import { db } from '@/db'
import { carts, cartItems } from '@/db/schema/carts'
import { products, productVariants } from '@/db/schema/products'
import { eq, and, sql } from 'drizzle-orm'
import { cookies } from 'next/headers'
import { createId } from '@paralleldrive/cuid2'
import { revalidatePath } from 'next/cache'

const CART_COOKIE_NAME = 'cart_token'
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

/**
 * Get or create cart token
 */
async function getOrCreateCartToken(): Promise<string> {
  const cookieStore = cookies()
  const existingToken = cookieStore.get(CART_COOKIE_NAME)?.value
  
  if (existingToken) {
    return existingToken
  }
  
  const newToken = createId()
  cookieStore.set(CART_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CART_COOKIE_MAX_AGE,
    path: '/'
  })
  
  return newToken
}

/**
 * Get or create cart
 */
async function getOrCreateCart(token: string) {
  // Try to find existing cart
  let cart = await db.query.carts.findFirst({
    where: and(
      eq(carts.token, token),
      eq(carts.status, 'active')
    )
  })
  
  // Create new cart if doesn't exist
  if (!cart) {
    const [newCart] = await db.insert(carts).values({
      token,
      status: 'active',
      expiresAt: new Date(Date.now() + CART_COOKIE_MAX_AGE * 1000)
    }).returning()
    
    cart = newCart
  } else {
    // Update expiration
    await db.update(carts)
      .set({ 
        expiresAt: new Date(Date.now() + CART_COOKIE_MAX_AGE * 1000),
        updatedAt: new Date()
      })
      .where(eq(carts.id, cart.id))
  }
  
  return cart
}

/**
 * Calculate cart totals
 */
async function calculateCartTotals(cartId: string) {
  const items = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cartId)
  })
  
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0)
  
  await db.update(carts)
    .set({
      subtotalAmount: subtotal,
      taxAmount: taxAmount,
      totalAmount: subtotal + taxAmount,
      updatedAt: new Date()
    })
    .where(eq(carts.id, cartId))
}

/**
 * Add item to cart
 */
export async function addToCart(
  productId: string,
  variantId: string,
  quantity: number = 1
) {
  try {
    // Get product and variant details
    const [product, variant] = await Promise.all([
      db.query.products.findFirst({
        where: eq(products.id, productId)
      }),
      db.query.productVariants.findFirst({
        where: eq(productVariants.id, variantId)
      })
    ])
    
    if (!product || !variant) {
      return { success: false, error: 'Product or variant not found' }
    }
    
    // Check inventory
    if (variant.inventoryQuantity < quantity) {
      return { success: false, error: 'Insufficient inventory' }
    }
    
    // Get or create cart
    const token = await getOrCreateCartToken()
    const cart = await getOrCreateCart(token)
    
    // Check if item already exists in cart
    const existingItem = await db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.cartId, cart.id),
        eq(cartItems.variantId, variantId)
      )
    })
    
    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = existingItem.quantity + quantity
      
      // Check inventory for new quantity
      if (variant.inventoryQuantity < newQuantity) {
        return { success: false, error: 'Insufficient inventory for requested quantity' }
      }
      
      const subtotal = variant.price * newQuantity
      const total = subtotal // Will apply discounts later
      
      await db.update(cartItems)
        .set({
          quantity: newQuantity,
          subtotal,
          total,
          updatedAt: new Date()
        })
        .where(eq(cartItems.id, existingItem.id))
    } else {
      // Add new item
      const subtotal = variant.price * quantity
      const total = subtotal // Will apply discounts later
      
      await db.insert(cartItems).values({
        cartId: cart.id,
        variantId: variant.id,
        productId: product.id,
        productTitle: product.title,
        productHandle: product.handle,
        productImage: product.images?.[0]?.url || null,
        variantTitle: variant.title || 'Default',
        variantImage: variant.image,
        sku: variant.sku,
        quantity,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        discountedPrice: variant.price,
        subtotal,
        total
      })
    }
    
    // Update cart totals
    await calculateCartTotals(cart.id)
    
    // Revalidate cart page
    revalidatePath('/cart')
    
    return { 
      success: true, 
      message: `${product.title} added to cart`,
      cartId: cart.id
    }
  } catch (error) {
    console.error('Error adding to cart:', error)
    return { success: false, error: 'Failed to add item to cart' }
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  itemId: string,
  quantity: number
) {
  try {
    if (quantity <= 0) {
      return removeFromCart(itemId)
    }
    
    // Get cart item with variant
    const item = await db.query.cartItems.findFirst({
      where: eq(cartItems.id, itemId),
      with: {
        variant: true
      }
    })
    
    if (!item) {
      return { success: false, error: 'Cart item not found' }
    }
    
    // Check inventory
    if (item.variant.inventoryQuantity < quantity) {
      return { success: false, error: 'Insufficient inventory' }
    }
    
    // Update item
    const subtotal = item.price * quantity
    const total = subtotal // Will apply discounts later
    
    await db.update(cartItems)
      .set({
        quantity,
        subtotal,
        total,
        updatedAt: new Date()
      })
      .where(eq(cartItems.id, itemId))
    
    // Update cart totals
    await calculateCartTotals(item.cartId)
    
    revalidatePath('/cart')
    
    return { success: true, message: 'Cart updated' }
  } catch (error) {
    console.error('Error updating cart item:', error)
    return { success: false, error: 'Failed to update cart' }
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(itemId: string) {
  try {
    const item = await db.query.cartItems.findFirst({
      where: eq(cartItems.id, itemId)
    })
    
    if (!item) {
      return { success: false, error: 'Cart item not found' }
    }
    
    // Delete item
    await db.delete(cartItems).where(eq(cartItems.id, itemId))
    
    // Update cart totals
    await calculateCartTotals(item.cartId)
    
    revalidatePath('/cart')
    
    return { success: true, message: 'Item removed from cart' }
  } catch (error) {
    console.error('Error removing from cart:', error)
    return { success: false, error: 'Failed to remove item' }
  }
}

/**
 * Get cart
 */
export async function getCart() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(CART_COOKIE_NAME)?.value
    
    if (!token) {
      return null
    }
    
    const cart = await db.query.carts.findFirst({
      where: and(
        eq(carts.token, token),
        eq(carts.status, 'active')
      ),
      with: {
        items: {
          with: {
            variant: {
              with: {
                product: true
              }
            }
          }
        }
      }
    })
    
    return cart
  } catch (error) {
    console.error('Error getting cart:', error)
    return null
  }
}

/**
 * Clear cart
 */
export async function clearCart() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(CART_COOKIE_NAME)?.value
    
    if (!token) {
      return { success: false, error: 'No cart found' }
    }
    
    const cart = await db.query.carts.findFirst({
      where: and(
        eq(carts.token, token),
        eq(carts.status, 'active')
      )
    })
    
    if (!cart) {
      return { success: false, error: 'Cart not found' }
    }
    
    // Delete all cart items
    await db.delete(cartItems).where(eq(cartItems.cartId, cart.id))
    
    // Reset cart totals
    await db.update(carts)
      .set({
        subtotalAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        shippingAmount: 0,
        totalAmount: 0,
        updatedAt: new Date()
      })
      .where(eq(carts.id, cart.id))
    
    revalidatePath('/cart')
    
    return { success: true, message: 'Cart cleared' }
  } catch (error) {
    console.error('Error clearing cart:', error)
    return { success: false, error: 'Failed to clear cart' }
  }
}

/**
 * Get cart item count
 */
export async function getCartItemCount(): Promise<number> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(CART_COOKIE_NAME)?.value
    
    if (!token) {
      return 0
    }
    
    const cart = await db.query.carts.findFirst({
      where: and(
        eq(carts.token, token),
        eq(carts.status, 'active')
      ),
      with: {
        items: true
      }
    })
    
    if (!cart) {
      return 0
    }
    
    return cart.items.reduce((sum, item) => sum + item.quantity, 0)
  } catch (error) {
    console.error('Error getting cart item count:', error)
    return 0
  }
}