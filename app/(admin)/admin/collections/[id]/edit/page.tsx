import { notFound } from 'next/navigation'
import { getCollectionById } from '@/lib/admin/queries/collections'
import { CollectionForm } from '@/components/admin/collections/collection-form'

interface EditCollectionPageProps {
  params: {
    id: string
  }
}

export default async function EditCollectionPage({ params }: EditCollectionPageProps) {
  const collection = await getCollectionById(params.id)

  if (!collection) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Collection</h1>
        <p className="text-muted-foreground">
          Update "{collection.title}" collection details
        </p>
      </div>

      <CollectionForm 
        collection={{
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
          description: collection.description || '',
          image: collection.image || '',
          status: collection.status as 'active' | 'draft',
          rulesType: collection.rulesType as 'manual' | 'automated',
          position: collection.position
        }} 
      />
    </div>
  )
}