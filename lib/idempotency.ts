import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// Idempotency keys table for preventing duplicate operations
const idempotencyKeys = pgTable('idempotency_keys', {
  id: text('id').notNull().primaryKey().$defaultFn(() => createId()),
  key: text('key').notNull().unique(),
  result: jsonb('result'),
  status: text('status').notNull().default('pending'), // 'pending' | 'success' | 'error'
  error: text('error'),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
})

export interface IdempotencyResult<T = any> {
  isNew: boolean
  result?: T
  error?: string
  status: 'pending' | 'success' | 'error'
}

/**
 * Check if an operation with this idempotency key has been processed before
 * If not, create a new record and return isNew: true
 * If yes, return the previous result
 */
export async function checkIdempotency<T = any>(
  key: string,
  ttlMinutes = 60
): Promise<IdempotencyResult<T>> {
  try {
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + ttlMinutes)

    // Try to find existing key
    const existing = await db.query.idempotencyKeys?.findFirst({
      where: sql`key = ${key} AND expires_at > NOW()`,
    })

    if (existing) {
      return {
        isNew: false,
        result: existing.result as T,
        error: existing.error || undefined,
        status: existing.status as any,
      }
    }

    // Create new idempotency record
    const [newRecord] = await db.insert(idempotencyKeys).values({
      key,
      status: 'pending',
      expiresAt,
    }).returning()

    return {
      isNew: true,
      status: 'pending',
    }
  } catch (error) {
    // If there's a unique constraint violation, someone else created it
    if (error instanceof Error && error.message.includes('unique')) {
      // Retry once to get the existing record
      const existing = await db.query.idempotencyKeys?.findFirst({
        where: sql`key = ${key} AND expires_at > NOW()`,
      })

      if (existing) {
        return {
          isNew: false,
          result: existing.result as T,
          error: existing.error || undefined,
          status: existing.status as any,
        }
      }
    }

    console.error('Error checking idempotency:', error)
    throw new Error('Idempotency check failed')
  }
}

/**
 * Save the result of an idempotent operation
 */
export async function saveIdempotencyResult<T = any>(
  key: string,
  result: T,
  status: 'success' | 'error' = 'success',
  error?: string
): Promise<void> {
  try {
    await db.update(idempotencyKeys)
      .set({
        result: result as any,
        status,
        error,
      })
      .where(sql`key = ${key}`)

  } catch (error) {
    console.error('Error saving idempotency result:', error)
    // Don't throw here as the main operation succeeded
  }
}

/**
 * Clean up expired idempotency keys
 */
export async function cleanupExpiredKeys(): Promise<void> {
  try {
    await db.delete(idempotencyKeys)
      .where(sql`expires_at < NOW()`)

  } catch (error) {
    console.error('Error cleaning up expired keys:', error)
  }
}

/**
 * Generate a webhook idempotency key
 */
export function generateWebhookIdempotencyKey(
  webhookId: string,
  eventType: string,
  resourceId: string
): string {
  return `webhook:${webhookId}:${eventType}:${resourceId}`
}

/**
 * Generate a payment operation idempotency key
 */
export function generatePaymentIdempotencyKey(
  operation: string,
  paymentId: string,
  orderId: string
): string {
  return `payment:${operation}:${paymentId}:${orderId}`
}