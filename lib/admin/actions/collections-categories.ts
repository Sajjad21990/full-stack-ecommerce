'use server'

import { db } from '@/db'
import { collections, categories } from '@/db/schema/collections'

export async function getCollectionsForSelect() {
  try {
    const result = await db.select({
      id: collections.id,
      title: collections.title,
      handle: collections.handle
    }).from(collections).orderBy(collections.title)
    
    return result
  } catch (error) {
    console.error('Error fetching collections:', error)
    return []
  }
}

export async function getCategoriesForSelect() {
  try {
    const result = await db.select({
      id: categories.id,
      name: categories.name,
      handle: categories.handle
    }).from(categories).orderBy(categories.name)
    
    return result
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}