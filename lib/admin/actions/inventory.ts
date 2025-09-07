'use server'

import { db } from '@/db'
import { eq, and, sql } from 'drizzle-orm'
import { stockLevels, inventoryAdjustments, inventoryLocations } from '@/db/schema/inventory'
import { createId } from '@paralleldrive/cuid2'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'

// Validation schemas
const InventoryAdjustmentSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  type: z.enum(['received', 'sold', 'returned', 'damaged', 'lost', 'correction', 'transfer']),
  quantity: z.number().int('Quantity must be an integer'),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

const BulkAdjustmentSchema = z.object({
  adjustments: z.array(z.object({
    variantId: z.string(),
    locationId: z.string(),
    quantity: z.number().int(),
    type: z.enum(['received', 'sold', 'returned', 'damaged', 'lost', 'correction', 'transfer']),
    reason: z.string().optional(),
  })),
  globalReason: z.string().optional(),
})

const ReorderSettingsSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  reorderPoint: z.number().min(0, 'Reorder point must be positive').optional(),
  reorderQuantity: z.number().min(1, 'Reorder quantity must be positive').optional(),
})

export type InventoryAdjustmentData = z.infer<typeof InventoryAdjustmentSchema>
export type BulkAdjustmentData = z.infer<typeof BulkAdjustmentSchema>
export type ReorderSettingsData = z.infer<typeof ReorderSettingsSchema>

/**
 * Create an inventory adjustment and update stock levels
 */
export async function createInventoryAdjustment(data: InventoryAdjustmentData) {
  try {
    // Verify admin access
    await requireAdmin()

    // Validate input
    const validatedData = InventoryAdjustmentSchema.parse(data)

    // Start a transaction
    await db.transaction(async (tx) => {
      // Create the adjustment record
      await tx.insert(inventoryAdjustments).values({
        id: createId(),
        variantId: validatedData.variantId,
        locationId: validatedData.locationId,
        type: validatedData.type,
        quantity: validatedData.quantity,
        reason: validatedData.reason,
        notes: validatedData.notes,
      })

      // Check if stock level record exists
      const existingStock = await tx
        .select()
        .from(stockLevels)
        .where(
          and(
            eq(stockLevels.variantId, validatedData.variantId),
            eq(stockLevels.locationId, validatedData.locationId)
          )
        )
        .limit(1)

      if (existingStock.length > 0) {
        // Update existing stock level
        await tx
          .update(stockLevels)
          .set({
            quantity: sql`${stockLevels.quantity} + ${validatedData.quantity}`,
            lastRestockedAt: validatedData.quantity > 0 ? new Date() : undefined,
            lastSoldAt: validatedData.quantity < 0 ? new Date() : undefined,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(stockLevels.variantId, validatedData.variantId),
              eq(stockLevels.locationId, validatedData.locationId)
            )
          )
      } else {
        // Create new stock level record
        await tx.insert(stockLevels).values({
          id: createId(),
          variantId: validatedData.variantId,
          locationId: validatedData.locationId,
          quantity: Math.max(0, validatedData.quantity), // Don't allow negative initial stock
          reservedQuantity: 0,
          incomingQuantity: 0,
          lastRestockedAt: validatedData.quantity > 0 ? new Date() : null,
          lastSoldAt: validatedData.quantity < 0 ? new Date() : null,
        })
      }
    })

    // Revalidate inventory pages
    revalidatePath('/admin/inventory')
    revalidatePath('/admin/products')

    return {
      success: true,
      message: 'Inventory adjustment created successfully'
    }
  } catch (error) {
    console.error('Error creating inventory adjustment:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation error',
        fieldErrors: error.flatten().fieldErrors
      }
    }

    return {
      success: false,
      error: 'Failed to create inventory adjustment'
    }
  }
}

/**
 * Process bulk inventory adjustments
 */
export async function bulkInventoryAdjustment(data: BulkAdjustmentData) {
  try {
    // Verify admin access
    await requireAdmin()

    // Validate input
    const validatedData = BulkAdjustmentSchema.parse(data)

    let successCount = 0
    let errorCount = 0

    // Process each adjustment in a transaction
    await db.transaction(async (tx) => {
      for (const adjustment of validatedData.adjustments) {
        try {
          // Create adjustment record
          await tx.insert(inventoryAdjustments).values({
            id: createId(),
            variantId: adjustment.variantId,
            locationId: adjustment.locationId,
            type: adjustment.type,
            quantity: adjustment.quantity,
            reason: adjustment.reason || validatedData.globalReason,
          })

          // Update stock levels
          const existingStock = await tx
            .select()
            .from(stockLevels)
            .where(
              and(
                eq(stockLevels.variantId, adjustment.variantId),
                eq(stockLevels.locationId, adjustment.locationId)
              )
            )
            .limit(1)

          if (existingStock.length > 0) {
            await tx
              .update(stockLevels)
              .set({
                quantity: sql`${stockLevels.quantity} + ${adjustment.quantity}`,
                lastRestockedAt: adjustment.quantity > 0 ? new Date() : undefined,
                lastSoldAt: adjustment.quantity < 0 ? new Date() : undefined,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(stockLevels.variantId, adjustment.variantId),
                  eq(stockLevels.locationId, adjustment.locationId)
                )
              )
          } else {
            await tx.insert(stockLevels).values({
              id: createId(),
              variantId: adjustment.variantId,
              locationId: adjustment.locationId,
              quantity: Math.max(0, adjustment.quantity),
              reservedQuantity: 0,
              incomingQuantity: 0,
              lastRestockedAt: adjustment.quantity > 0 ? new Date() : null,
              lastSoldAt: adjustment.quantity < 0 ? new Date() : null,
            })
          }

          successCount++
        } catch (error) {
          console.error('Error processing bulk adjustment:', error)
          errorCount++
        }
      }
    })

    // Revalidate inventory pages
    revalidatePath('/admin/inventory')
    revalidatePath('/admin/products')

    return {
      success: true,
      message: `Processed ${successCount} adjustments successfully${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
      successCount,
      errorCount
    }
  } catch (error) {
    console.error('Error processing bulk inventory adjustments:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation error',
        fieldErrors: error.flatten().fieldErrors
      }
    }

    return {
      success: false,
      error: 'Failed to process bulk adjustments'
    }
  }
}

/**
 * Update reorder settings for a variant at a location
 */
export async function updateReorderSettings(data: ReorderSettingsData) {
  try {
    // Verify admin access
    await requireAdmin()

    // Validate input
    const validatedData = ReorderSettingsSchema.parse(data)

    // Check if stock level record exists
    const existingStock = await db
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.variantId, validatedData.variantId),
          eq(stockLevels.locationId, validatedData.locationId)
        )
      )
      .limit(1)

    if (existingStock.length > 0) {
      // Update existing stock level
      await db
        .update(stockLevels)
        .set({
          reorderPoint: validatedData.reorderPoint,
          reorderQuantity: validatedData.reorderQuantity,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(stockLevels.variantId, validatedData.variantId),
            eq(stockLevels.locationId, validatedData.locationId)
          )
        )
    } else {
      // Create new stock level record with reorder settings
      await db.insert(stockLevels).values({
        id: createId(),
        variantId: validatedData.variantId,
        locationId: validatedData.locationId,
        quantity: 0,
        reservedQuantity: 0,
        incomingQuantity: 0,
        reorderPoint: validatedData.reorderPoint,
        reorderQuantity: validatedData.reorderQuantity,
      })
    }

    // Revalidate inventory pages
    revalidatePath('/admin/inventory')
    revalidatePath('/admin/products')

    return {
      success: true,
      message: 'Reorder settings updated successfully'
    }
  } catch (error) {
    console.error('Error updating reorder settings:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation error',
        fieldErrors: error.flatten().fieldErrors
      }
    }

    return {
      success: false,
      error: 'Failed to update reorder settings'
    }
  }
}

/**
 * Set stock quantity directly (creates adjustment record)
 */
export async function setStockQuantity(variantId: string, locationId: string, newQuantity: number, reason?: string) {
  try {
    // Verify admin access
    await requireAdmin()

    // Get current stock level
    const currentStock = await db
      .select()
      .from(stockLevels)
      .where(
        and(
          eq(stockLevels.variantId, variantId),
          eq(stockLevels.locationId, locationId)
        )
      )
      .limit(1)

    const currentQuantity = currentStock[0]?.quantity || 0
    const adjustment = newQuantity - currentQuantity

    if (adjustment === 0) {
      return {
        success: true,
        message: 'No adjustment needed - quantity unchanged'
      }
    }

    // Create adjustment using the existing function
    return await createInventoryAdjustment({
      variantId,
      locationId,
      type: 'correction',
      quantity: adjustment,
      reason: reason || `Set stock to ${newQuantity}`,
    })
  } catch (error) {
    console.error('Error setting stock quantity:', error)
    return {
      success: false,
      error: 'Failed to set stock quantity'
    }
  }
}

/**
 * Create default inventory location
 */
export async function createDefaultLocation() {
  try {
    // Verify admin access
    await requireAdmin()

    // Check if default location already exists
    const existingDefault = await db
      .select()
      .from(inventoryLocations)
      .where(eq(inventoryLocations.isDefault, true))
      .limit(1)

    if (existingDefault.length > 0) {
      return {
        success: true,
        message: 'Default location already exists',
        locationId: existingDefault[0].id
      }
    }

    // Create default location
    const locationId = createId()
    await db.insert(inventoryLocations).values({
      id: locationId,
      name: 'Main Warehouse',
      code: 'MAIN',
      type: 'warehouse',
      country: 'IN',
      isActive: true,
      isDefault: true,
      fulfillsOnlineOrders: true,
    })

    return {
      success: true,
      message: 'Default location created successfully',
      locationId
    }
  } catch (error) {
    console.error('Error creating default location:', error)
    return {
      success: false,
      error: 'Failed to create default location'
    }
  }
}