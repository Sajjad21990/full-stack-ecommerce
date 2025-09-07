import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCollectionById } from '@/lib/admin/queries/collections'
import { AddProductsToCollection } from '@/components/admin/collections/add-products-to-collection'

interface AddProductsPageProps {
  params: {
    id: string
  }
  searchParams: {
    search?: string
  }
}

export default async function AddProductsPage({ params, searchParams }: AddProductsPageProps) {
  const collection = await getCollectionById(params.id)

  if (!collection) {
    notFound()
  }

  if (collection.rulesType !== 'manual') {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/admin/collections/${collection.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Products</h1>
          <p className="text-muted-foreground">
            Add products to "{collection.title}" collection
          </p>
        </div>
      </div>

      <AddProductsToCollection 
        collectionId={collection.id} 
        searchQuery={searchParams.search}
      />
    </div>
  )
}