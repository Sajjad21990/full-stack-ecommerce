'use client'

import { useState } from 'react'
import { Trash2, GripVertical, Package, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/utils'
import { removeProductFromCollection } from '@/lib/admin/actions/collections'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Product {
  id: string
  title: string
  handle: string
  status: string
  price: number
}

interface ProductInCollection {
  position: number
  product: Product
}

interface ProductsInCollectionProps {
  collection: {
    id: string
    rulesType: 'manual' | 'automated'
  }
  products: ProductInCollection[]
}

export function ProductsInCollection({ collection, products }: ProductsInCollectionProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleRemoveProduct = async (productId: string, productTitle: string) => {
    if (!confirm(`Remove "${productTitle}" from this collection?`)) {
      return
    }

    setLoadingId(productId)
    try {
      const result = await removeProductFromCollection(collection.id, productId)
      if (result.success) {
        toast.success('Product removed from collection')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to remove product')
      }
    } catch (error) {
      toast.error('Failed to remove product')
    } finally {
      setLoadingId(null)
    }
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">No products</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {collection.rulesType === 'manual' 
            ? 'Add products to this collection to get started.'
            : 'No products match the automated rules yet.'
          }
        </p>
      </div>
    )
  }

  // Sort products by position
  const sortedProducts = [...products].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProducts.map((item) => (
              <TableRow key={item.product.id}>
                <TableCell>
                  <div className="flex items-center justify-center cursor-move">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/admin/products/${item.product.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.product.title}
                        </Link>
                        <Link 
                          href={`/admin/products/${item.product.id}`}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        /{item.product.handle}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={item.product.status === 'active' ? 'default' : 'secondary'}>
                    {item.product.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{formatPrice(item.product.price)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{item.position}</span>
                </TableCell>
                <TableCell>
                  {collection.rulesType === 'manual' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProduct(item.product.id, item.product.title)}
                      disabled={loadingId === item.product.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}