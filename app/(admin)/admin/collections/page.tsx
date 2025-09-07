import { Suspense } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getCollections, getCategories } from '@/lib/admin/queries/collections'
import { CollectionsTable } from '@/components/admin/collections/collections-table'
import { CollectionsFilters } from '@/components/admin/collections/collections-filters'
import { CategoriesTree } from '@/components/admin/collections/categories-tree'

interface CollectionsPageProps {
  searchParams: {
    search?: string
    status?: 'draft' | 'active'
    sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'position'
    sortOrder?: 'asc' | 'desc'
    page?: string
    limit?: string
  }
}

export default function CollectionsPage({ searchParams }: CollectionsPageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Collections & Categories</h1>
          <p className="text-muted-foreground">
            Organize your products into collections and categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/admin/collections/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Collection
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/collections/categories/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Category
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Collections */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Collections</CardTitle>
              <CardDescription>
                Curated groups of products for marketing and organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="h-20" />}>
                <CollectionsFilters />
              </Suspense>
              
              <div className="mt-4">
                <Suspense fallback={<CollectionsTableSkeleton />}>
                  <CollectionsTableWrapper searchParams={searchParams} />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categories */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Hierarchical product classification system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<CategoriesTreeSkeleton />}>
                <CategoriesTreeWrapper />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

async function CollectionsTableWrapper({ searchParams }: { searchParams: CollectionsPageProps['searchParams'] }) {
  const filters = {
    search: searchParams.search,
    status: searchParams.status,
    sortBy: searchParams.sortBy || 'position',
    sortOrder: searchParams.sortOrder || 'asc',
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '20')
  }

  const { collections, pagination } = await getCollections(filters)

  return <CollectionsTable collections={collections} pagination={pagination} currentFilters={filters} />
}

async function CategoriesTreeWrapper() {
  const categories = await getCategories()
  return <CategoriesTree categories={categories} />
}

function CollectionsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoriesTreeSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}