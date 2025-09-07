import { CollectionForm } from '@/components/admin/collections/collection-form'

export default function NewCollectionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Collection</h1>
        <p className="text-muted-foreground">
          Create a new collection to group related products
        </p>
      </div>

      <CollectionForm />
    </div>
  )
}