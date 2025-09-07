'use server'

import { db } from '@/db'
import { discounts, discountProducts, discountCollections, discountUsages } from '@/db/schema/discounts'
import { eq, and, sql } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createId } from '@paralleldrive/cuid2'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export interface CreateDiscountData {
  title: string
  code: string
  description?: string
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
  value: number
  appliesToType: 'all' | 'products' | 'collections'
  selectedProducts?: string[]
  selectedCollections?: string[]
  minimumAmount?: number
  maximumAmount?: number
  usageLimit?: number
  usageLimitPerCustomer?: number
  oncePerCustomer: boolean
  customerEligibility: 'all' | 'specific' | 'groups'
  selectedCustomers?: string[]
  prerequisiteQuantity?: number
  entitledQuantity?: number
  startsAt?: Date
  endsAt?: Date
  combinesWithProductDiscounts: boolean
  combinesWithOrderDiscounts: boolean
  combinesWithShippingDiscounts: boolean
}

export async function createDiscount(data: CreateDiscountData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const discountId = createId()

    // Determine initial status
    let status = 'active'
    if (data.startsAt && data.startsAt > new Date()) {
      status = 'scheduled'
    }

    await db.transaction(async (tx) => {
      // Create discount
      await tx.insert(discounts).values({
        id: discountId,
        code: data.code.toUpperCase(),
        title: data.title,
        description: data.description,
        type: data.type,
        value: data.type === 'percentage' ? Math.round(data.value * 100) : Math.round(data.value * 100), // Store as basis points or cents
        appliesToType: data.appliesToType,
        minimumAmount: data.minimumAmount ? Math.round(data.minimumAmount * 100) : undefined,
        maximumAmount: data.maximumAmount ? Math.round(data.maximumAmount * 100) : undefined,
        usageLimit: data.usageLimit,
        usageLimitPerCustomer: data.usageLimitPerCustomer,
        customerEligibility: data.customerEligibility,
        prerequisiteCustomerIds: data.selectedCustomers,
        oncePerCustomer: data.oncePerCustomer,
        prerequisiteQuantity: data.prerequisiteQuantity,
        entitledQuantity: data.entitledQuantity,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status,
        combinesWith: {
          productDiscounts: data.combinesWithProductDiscounts,
          orderDiscounts: data.combinesWithOrderDiscounts,
          shippingDiscounts: data.combinesWithShippingDiscounts
        }
      })

      // Add product associations
      if (data.appliesToType === 'products' && data.selectedProducts?.length) {
        const productAssociations = data.selectedProducts.map(productId => ({
          discountId,
          productId
        }))
        await tx.insert(discountProducts).values(productAssociations)
      }

      // Add collection associations
      if (data.appliesToType === 'collections' && data.selectedCollections?.length) {
        const collectionAssociations = data.selectedCollections.map(collectionId => ({
          discountId,
          collectionId
        }))
        await tx.insert(discountCollections).values(collectionAssociations)
      }
    })

    revalidateTag('admin-discounts')
    revalidatePath('/admin/discounts')

    return { success: true, discountId }
  } catch (error) {
    console.error('Error creating discount:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create discount' }
  }
}

export async function updateDiscount(discountId: string, data: Partial<CreateDiscountData>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Determine status
    let status = 'active'
    if (data.startsAt && data.startsAt > new Date()) {
      status = 'scheduled'
    } else if (data.endsAt && data.endsAt < new Date()) {
      status = 'expired'
    }

    await db.transaction(async (tx) => {
      // Update discount
      await tx.update(discounts)
        .set({
          code: data.code?.toUpperCase(),
          title: data.title,
          description: data.description,
          type: data.type,
          value: data.value ? (data.type === 'percentage' ? Math.round(data.value * 100) : Math.round(data.value * 100)) : undefined,
          appliesToType: data.appliesToType,
          minimumAmount: data.minimumAmount !== undefined ? (data.minimumAmount ? Math.round(data.minimumAmount * 100) : null) : undefined,
          maximumAmount: data.maximumAmount !== undefined ? (data.maximumAmount ? Math.round(data.maximumAmount * 100) : null) : undefined,
          usageLimit: data.usageLimit,
          usageLimitPerCustomer: data.usageLimitPerCustomer,
          customerEligibility: data.customerEligibility,
          prerequisiteCustomerIds: data.selectedCustomers,
          oncePerCustomer: data.oncePerCustomer,
          prerequisiteQuantity: data.prerequisiteQuantity,
          entitledQuantity: data.entitledQuantity,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          status,
          combinesWith: data.combinesWithProductDiscounts !== undefined ? {
            productDiscounts: data.combinesWithProductDiscounts,
            orderDiscounts: data.combinesWithOrderDiscounts || false,
            shippingDiscounts: data.combinesWithShippingDiscounts || false
          } : undefined,
          updatedAt: new Date()
        })
        .where(eq(discounts.id, discountId))

      // Update product associations
      if (data.appliesToType === 'products' && data.selectedProducts !== undefined) {
        // Remove existing associations
        await tx.delete(discountProducts).where(eq(discountProducts.discountId, discountId))
        
        // Add new associations
        if (data.selectedProducts.length > 0) {
          const productAssociations = data.selectedProducts.map(productId => ({
            discountId,
            productId
          }))
          await tx.insert(discountProducts).values(productAssociations)
        }
      }

      // Update collection associations
      if (data.appliesToType === 'collections' && data.selectedCollections !== undefined) {
        // Remove existing associations
        await tx.delete(discountCollections).where(eq(discountCollections.discountId, discountId))
        
        // Add new associations
        if (data.selectedCollections.length > 0) {
          const collectionAssociations = data.selectedCollections.map(collectionId => ({
            discountId,
            collectionId
          }))
          await tx.insert(discountCollections).values(collectionAssociations)
        }
      }
    })

    revalidateTag('admin-discounts')
    revalidatePath('/admin/discounts')
    revalidatePath(`/admin/discounts/${discountId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating discount:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update discount' }
  }
}

export async function deleteDiscount(discountId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await db.delete(discounts).where(eq(discounts.id, discountId))

    revalidateTag('admin-discounts')
    revalidatePath('/admin/discounts')

    return { success: true }
  } catch (error) {
    console.error('Error deleting discount:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete discount' }
  }
}

export async function toggleDiscountStatus(discountId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const discount = await db.query.discounts.findFirst({
      where: eq(discounts.id, discountId)
    })

    if (!discount) {
      throw new Error('Discount not found')
    }

    const newStatus = discount.status === 'active' ? 'disabled' : 'active'

    await db.update(discounts)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(discounts.id, discountId))

    revalidateTag('admin-discounts')
    revalidatePath('/admin/discounts')
    revalidatePath(`/admin/discounts/${discountId}`)

    return { success: true, status: newStatus }
  } catch (error) {
    console.error('Error toggling discount status:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to toggle discount status' }
  }
}

export async function duplicateDiscount(discountId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    const original = await db.query.discounts.findFirst({
      where: eq(discounts.id, discountId),
      with: {
        products: true,
        collections: true
      }
    })

    if (!original) {
      throw new Error('Discount not found')
    }

    const newDiscountId = createId()
    const newCode = `${original.code}_COPY_${Date.now().toString(36).toUpperCase()}`

    await db.transaction(async (tx) => {
      // Create duplicate discount
      await tx.insert(discounts).values({
        ...original,
        id: newDiscountId,
        code: newCode,
        title: `${original.title} (Copy)`,
        status: 'draft',
        currentUsage: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Duplicate product associations
      if (original.products?.length) {
        const productAssociations = original.products.map(p => ({
          discountId: newDiscountId,
          productId: p.productId
        }))
        await tx.insert(discountProducts).values(productAssociations)
      }

      // Duplicate collection associations
      if (original.collections?.length) {
        const collectionAssociations = original.collections.map(c => ({
          discountId: newDiscountId,
          collectionId: c.collectionId
        }))
        await tx.insert(discountCollections).values(collectionAssociations)
      }
    })

    revalidateTag('admin-discounts')
    revalidatePath('/admin/discounts')

    return { success: true, discountId: newDiscountId }
  } catch (error) {
    console.error('Error duplicating discount:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to duplicate discount' }
  }
}

export async function applyDiscountToOrder(orderId: string, discountCode: string, customerId?: string, orderAmount?: number) {
  try {
    // Validate discount
    const discount = await db.query.discounts.findFirst({
      where: and(
        eq(discounts.code, discountCode.toUpperCase()),
        eq(discounts.status, 'active')
      )
    })

    if (!discount) {
      return { success: false, error: 'Invalid discount code' }
    }

    // Check minimum amount
    if (discount.minimumAmount && orderAmount && orderAmount < discount.minimumAmount) {
      return { success: false, error: `Minimum order amount of ${discount.minimumAmount / 100} required` }
    }

    // Calculate discount amount
    let discountAmount = 0
    if (discount.type === 'percentage' && orderAmount) {
      discountAmount = Math.round(orderAmount * (discount.value / 10000)) // value is in basis points
      if (discount.maximumAmount) {
        discountAmount = Math.min(discountAmount, discount.maximumAmount)
      }
    } else if (discount.type === 'fixed_amount') {
      discountAmount = discount.value
    }

    // Record usage
    await db.transaction(async (tx) => {
      await tx.insert(discountUsages).values({
        discountId: discount.id,
        customerId,
        orderId,
        discountAmount,
        currency: 'INR'
      })

      // Update usage counter
      await tx.update(discounts)
        .set({
          currentUsage: sql`${discounts.currentUsage} + 1`,
          updatedAt: new Date()
        })
        .where(eq(discounts.id, discount.id))
    })

    revalidateTag('admin-discounts')

    return { 
      success: true, 
      discountAmount,
      discountType: discount.type
    }
  } catch (error) {
    console.error('Error applying discount:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to apply discount' }
  }
}