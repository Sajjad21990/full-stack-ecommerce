import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/db'
import { categories } from '@/db/schema/collections'
import { eq } from 'drizzle-orm'
import { CategoryForm } from '@/components/admin/collections/category-form'

export const metadata: Metadata = {
  title: 'Edit Category',
  description: 'Edit product category',
}

export default async function EditCategoryPage({
  params,
}: {
  params: { id: string }
}) {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, params.id))
    .limit(1)

  if (!category) {
    notFound()
  }

  const categoriesData = await db
    .select({
      id: categories.id,
      name: categories.name,
      handle: categories.handle,
      parentId: categories.parentId,
      level: categories.level,
    })
    .from(categories)
    .orderBy(categories.level, categories.position, categories.name)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Category</h1>
        <p className="text-muted-foreground">
          Update category details and settings
        </p>
      </div>

      <CategoryForm
        category={{
          id: category.id,
          name: category.name,
          handle: category.handle,
          description: category.description || undefined,
          image: category.image || undefined,
          parentId: category.parentId || undefined,
          position: category.position,
        }}
        categories={categoriesData}
      />
    </div>
  )
}
