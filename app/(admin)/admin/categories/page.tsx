import { Metadata } from 'next'
import { db } from '@/db'
import { categories } from '@/db/schema/collections'
import { desc, sql } from 'drizzle-orm'
import { CategoriesList } from '@/components/admin/categories/categories-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Manage product categories',
}

export default async function CategoriesPage() {
  const categoriesData = await db
    .select({
      id: categories.id,
      name: categories.name,
      handle: categories.handle,
      description: categories.description,
      image: categories.image,
      parentId: categories.parentId,
      path: categories.path,
      level: categories.level,
      position: categories.position,
      isActive: categories.isActive,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
      productCount: sql<number>`(
        SELECT COUNT(DISTINCT product_id)
        FROM product_categories
        WHERE category_id = ${categories.id}
      )`.as('productCount'),
    })
    .from(categories)
    .orderBy(categories.level, categories.position, categories.name)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Organize products into hierarchical categories
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/categories/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Link>
        </Button>
      </div>

      {/* Categories List */}
      <CategoriesList categories={categoriesData} />
    </div>
  )
}
