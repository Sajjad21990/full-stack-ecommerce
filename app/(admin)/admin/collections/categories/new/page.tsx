import { Suspense } from 'react'
import { CategoryForm } from '@/components/admin/collections/category-form'
import { getCategories } from '@/lib/admin/queries/collections'

interface NewCategoryPageProps {
  searchParams: {
    parent?: string
  }
}

export default function NewCategoryPage({ searchParams }: NewCategoryPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Category</h1>
        <p className="text-muted-foreground">
          Create a new category to organize your products
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <CategoryFormWrapper parentId={searchParams.parent} />
      </Suspense>
    </div>
  )
}

async function CategoryFormWrapper({ parentId }: { parentId?: string }) {
  const categories = await getCategories()
  return <CategoryForm categories={categories} parentId={parentId} />
}