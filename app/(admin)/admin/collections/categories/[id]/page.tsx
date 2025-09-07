import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getCategoryById } from '@/lib/admin/queries/categories'
import { ProductsInCategory } from '@/components/admin/categories/products-in-category'
import { formatDate } from '@/lib/utils'

interface CategoryDetailPageProps {
  params: {
    id: string
  }
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const category = await getCategoryById(params.id)

  if (!category) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/collections/categories">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
            <Badge variant={category.isActive ? 'default' : 'secondary'}>
              {category.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            /{category.handle}
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/collections/categories/${category.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Category
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Category Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Image */}
          {category.image && (
            <Card>
              <CardContent className="p-4">
                <img 
                  src={category.image} 
                  alt={category.name}
                  className="w-full h-48 object-cover rounded-md"
                />
              </CardContent>
            </Card>
          )}

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.description && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-sm mb-1">Products</h4>
                <p className="text-sm text-muted-foreground">
                  {category.productCategories?.length || 0} products
                </p>
              </div>

              {category.parentId && (
                <div>
                  <h4 className="font-medium text-sm mb-1">Parent Category</h4>
                  <p className="text-sm text-muted-foreground">
                    {category.parent?.name || 'Unknown'}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm mb-1">Created</h4>
                <p className="text-sm text-muted-foreground">
                  {formatDate(category.createdAt)}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-1">Position</h4>
                <p className="text-sm text-muted-foreground">{category.sortOrder}</p>
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
                    Products in this category
                  </CardDescription>
                </div>
                <Button size="sm" asChild>
                  <Link href={`/admin/collections/categories/${category.id}/products`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Products
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ProductsInCategory 
                category={category}
                products={category.productCategories || []}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}