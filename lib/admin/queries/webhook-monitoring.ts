import { db } from '@/db'
import { sql, eq, desc, gte, count } from 'drizzle-orm'
import { webhookDeliveries, webhooks } from '@/db/schema'

export interface WebhookDelivery {
  id: string
  eventType: string
  status: 'success' | 'failed' | 'pending'
  processingTime: number
  attempts: number
  payload: any
  response?: any
  createdAt: string
  completedAt?: string
}

export interface WebhookStats {
  total: number
  successful: number
  failed: number
  averageProcessingTime: number
  successRate: number
}

/**
 * Get webhook delivery statistics
 */
export async function getWebhookStats(days: number = 7): Promise<WebhookStats> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      avgProcessingTime
    ] = await Promise.all([
      // Total deliveries
      db.select({ count: count() })
        .from(webhookDeliveries)
        .where(gte(webhookDeliveries.createdAt, startDate)),

      // Successful deliveries
      db.select({ count: count() })
        .from(webhookDeliveries)
        .where(sql`${webhookDeliveries.status} = 'success' AND ${webhookDeliveries.createdAt} >= ${startDate}`),

      // Failed deliveries
      db.select({ count: count() })
        .from(webhookDeliveries)
        .where(sql`${webhookDeliveries.status} = 'failed' AND ${webhookDeliveries.createdAt} >= ${startDate}`),

      // Average processing time (in milliseconds)
      db.select({ 
        avg: sql<number>`AVG(EXTRACT(EPOCH FROM (${webhookDeliveries.completedAt} - ${webhookDeliveries.createdAt})) * 1000)` 
      })
        .from(webhookDeliveries)
        .where(sql`${webhookDeliveries.completedAt} IS NOT NULL AND ${webhookDeliveries.createdAt} >= ${startDate}`)
    ])

    const total = totalDeliveries[0]?.count || 0
    const successful = successfulDeliveries[0]?.count || 0
    const failed = failedDeliveries[0]?.count || 0
    const avgTime = avgProcessingTime[0]?.avg || 0

    return {
      total,
      successful,
      failed,
      averageProcessingTime: Math.round(avgTime),
      successRate: total > 0 ? Math.round((successful / total) * 100) : 100
    }
  } catch (error) {
    console.error('Error fetching webhook stats:', error)
    return {
      total: 0,
      successful: 0,
      failed: 0,
      averageProcessingTime: 0,
      successRate: 100
    }
  }
}

/**
 * Get recent webhook deliveries
 */
export async function getRecentWebhookDeliveries(limit: number = 50): Promise<WebhookDelivery[]> {
  try {
    const deliveries = await db.select({
      id: webhookDeliveries.id,
      eventType: webhookDeliveries.eventType,
      status: webhookDeliveries.status,
      attempts: webhookDeliveries.attempts,
      payload: webhookDeliveries.payload,
      responseBody: webhookDeliveries.responseBody,
      createdAt: webhookDeliveries.createdAt,
      completedAt: webhookDeliveries.completedAt
    })
    .from(webhookDeliveries)
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit)

    return deliveries.map(delivery => {
      const created = new Date(delivery.createdAt)
      const completed = delivery.completedAt ? new Date(delivery.completedAt) : null
      const processingTime = completed ? completed.getTime() - created.getTime() : 0

      let response: any = null
      try {
        response = delivery.responseBody ? JSON.parse(delivery.responseBody) : null
      } catch {
        response = { raw: delivery.responseBody }
      }

      return {
        id: delivery.id,
        eventType: delivery.eventType,
        status: delivery.status as WebhookDelivery['status'],
        processingTime,
        attempts: delivery.attempts,
        payload: delivery.payload,
        response,
        createdAt: delivery.createdAt.toISOString(),
        completedAt: delivery.completedAt?.toISOString()
      }
    })
  } catch (error) {
    console.error('Error fetching webhook deliveries:', error)
    return []
  }
}

/**
 * Get webhook delivery by ID
 */
export async function getWebhookDeliveryById(id: string): Promise<WebhookDelivery | null> {
  try {
    const delivery = await db.select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.id, id))
      .limit(1)

    if (!delivery[0]) return null

    const deliveryData = delivery[0]
    const created = new Date(deliveryData.createdAt)
    const completed = deliveryData.completedAt ? new Date(deliveryData.completedAt) : null
    const processingTime = completed ? completed.getTime() - created.getTime() : 0

    let response: any = null
    try {
      response = deliveryData.responseBody ? JSON.parse(deliveryData.responseBody) : null
    } catch {
      response = { raw: deliveryData.responseBody }
    }

    return {
      id: deliveryData.id,
      eventType: deliveryData.eventType,
      status: deliveryData.status as WebhookDelivery['status'],
      processingTime,
      attempts: deliveryData.attempts,
      payload: deliveryData.payload,
      response,
      createdAt: deliveryData.createdAt.toISOString(),
      completedAt: deliveryData.completedAt?.toISOString()
    }
  } catch (error) {
    console.error('Error fetching webhook delivery:', error)
    return null
  }
}

/**
 * Get webhook endpoints configuration
 */
export async function getWebhookEndpoints() {
  try {
    return await db.select({
      id: webhooks.id,
      name: webhooks.name,
      url: webhooks.url,
      events: webhooks.events,
      isActive: webhooks.isActive,
      totalDeliveries: webhooks.totalDeliveries,
      successfulDeliveries: webhooks.successfulDeliveries,
      failedDeliveries: webhooks.failedDeliveries,
      lastDeliveryAt: webhooks.lastDeliveryAt,
      lastSuccessAt: webhooks.lastSuccessAt
    })
    .from(webhooks)
    .orderBy(desc(webhooks.createdAt))
  } catch (error) {
    console.error('Error fetching webhook endpoints:', error)
    return []
  }
}