import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCollectionById } from '@/lib/admin/queries/collections'
import { ProductsInCollection } from '@/components/admin/collections/products-in-collection'
import { formatDate } from '@/lib/utils'

interface CollectionDetailPageProps {
  params: {
    id: string
  }
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const collection = await getCollectionById(params.id)

  if (!collection) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/collections">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{collection.title}</h1>
            <Badge variant={collection.status === 'active' ? 'default' : 'secondary'}>
              {collection.status}
            </Badge>
            <Badge variant="outline">
              {collection.rulesType}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            /{collection.handle}
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/collections/${collection.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Collection
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Collection Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Image */}
          {collection.image && (
            <Card>
              <CardContent className="p-4">
                <img 
                  src={collection.image} 
                  alt={collection.title}
                  className="w-full h-48 object-cover rounded-md"
                />
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {collection.description && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{collection.description}</p>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-sm mb-1">Products</h4>
                <p className="text-sm text-muted-foreground">
                  {collection.productCollections?.length || 0} products
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-1">Created</h4>
                <p className="text-sm text-muted-foreground">
                  {formatDate(collection.createdAt)}
                </p>
              </div>

              {collection.publishedAt && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Published</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(collection.publishedAt)}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm mb-1">Position</h4>
                <p className="text-sm text-muted-foreground">{collection.position}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>
                    {collection.rulesType === 'manual' 
                      ? 'Manually selected products in this collection'
                      : 'Products automatically included based on rules'
                    }
                  </CardDescription>
                </div>
                {collection.rulesType === 'manual' && (
                  <Button size="sm" asChild>
                    <Link href={`/admin/collections/${collection.id}/products`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Products
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ProductsInCollection 
                collection={{ 
                  id: collection.id, 
                  rulesType: (collection.rulesType || 'manual') as 'manual' | 'automated' 
                }}
                products={(collection.productCollections || []) as any}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}