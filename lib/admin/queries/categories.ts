import { db } from '@/db'
import { eq, desc } from 'drizzle-orm'
import { categories } from '@/db/schema/collections'

export async function getCategoryById(id: string) {
  try {
    return await db.query.categories.findFirst({
      where: eq(categories.id, id),
      with: {
        parent: true,
        productCategories: {
          with: {
            product: true
          }
        }
      }
    })
  } catch (error) {
    console.error('Error fetching category by ID:', error)
    return null
  }
}

export async function getCategories() {
  try {
    return await db.select().from(categories).orderBy(desc(categories.createdAt))
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}