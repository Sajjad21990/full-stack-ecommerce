import { db } from '@/db'
import { sql } from 'drizzle-orm'
import { products } from '@/db/schema/products'

export async function getAllTags(): Promise<string[]> {
  try {
    // Get all unique tags from all products
    const result = await db.select({
      tag: sql<string>`unnest(${products.tags})`
    })
    .from(products)
    .where(sql`${products.tags} IS NOT NULL AND array_length(${products.tags}, 1) > 0`)

    // Extract unique tags and sort them
    const uniqueTags = [...new Set(result.map(r => r.tag))].filter(Boolean).sort()
    return uniqueTags
  } catch (error) {
    console.error('Error fetching tags:', error)
    return []
  }
}

export async function getPopularTags(limit: number = 20): Promise<{tag: string, count: number}[]> {
  try {
    // Get tags with their usage count
    const result = await db.select({
      tag: sql<string>`unnest(${products.tags})`,
      count: sql<number>`count(*)`
    })
    .from(products)
    .where(sql`${products.tags} IS NOT NULL AND array_length(${products.tags}, 1) > 0`)
    .groupBy(sql`unnest(${products.tags})`)
    .orderBy(sql`count(*) DESC`)
    .limit(limit)

    return result
  } catch (error) {
    console.error('Error fetching popular tags:', error)
    return []
  }
}