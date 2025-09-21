import { Metadata } from 'next'
import { db } from '@/db'
import { categories } from '@/db/schema/collections'
import { CategoryForm } from '@/components/admin/collections/category-form'

export const metadata: Metadata = {
  title: 'Create Category',
  description: 'Create a new product category',
}

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: { parent?: string }
}) {
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
        <h1 className="text-3xl font-bold tracking-tight">Create Category</h1>
        <p className="text-muted-foreground">
          Add a new category to organize your products
        </p>
      </div>

      <CategoryForm
        categories={categoriesData}
        parentId={searchParams.parent}
      />
    </div>
  )
}
