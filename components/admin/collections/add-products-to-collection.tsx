'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Package, Plus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { getProductsNotInCollection, addProductsToCollection } from '@/lib/admin/actions/collections'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import { useDebounce } from '@/hooks/use-debounce'

interface Product {
  id: string
  title: string
  handle: string
  status: string
  price: number
}

interface AddProductsToCollectionProps {
  collectionId: string
  searchQuery?: string
}

export function AddProductsToCollection({ collectionId, searchQuery = '' }: AddProductsToCollectionProps) {
  const router = useRouter()
  const [search, setSearch] = useState(searchQuery)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    loadProducts()
  }, [debouncedSearch, collectionId])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const result = await getProductsNotInCollection(collectionId, debouncedSearch || undefined)
      setProducts(result)
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleAddProducts = async () => {
    if (selectedProducts.size === 0) {
      toast.error('Please select at least one product')
      return
    }

    setSubmitting(true)
    try {
      const result = await addProductsToCollection(collectionId, Array.from(selectedProducts))
      if (result.success) {
        toast.success(`Added ${selectedProducts.size} product${selectedProducts.size > 1 ? 's' : ''} to collection`)
        router.back()
      } else {
        toast.error(result.error || 'Failed to add products')
      }
    } catch (error) {
      toast.error('Failed to add products')
    } finally {
      setSubmitting(false)
    }
  }

  const selectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)))
    }
  }

  return (
    <div className="space-y-6">
      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={selectAll}
            disabled={loading || products.length === 0}
          >
            {selectedProducts.size === products.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Button
            onClick={handleAddProducts}
            disabled={selectedProducts.size === 0 || submitting}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add {selectedProducts.size > 0 && `(${selectedProducts.size})`} Products
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">No products found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search 
              ? 'Try adjusting your search terms.'
              : 'All active products are already in this collection.'
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isSelected = selectedProducts.has(product.id)
            return (
              <Card 
                key={product.id} 
                className={`cursor-pointer transition-colors hover:bg-accent ${
                  isSelected ? 'ring-2 ring-primary bg-accent' : ''
                }`}
                onClick={() => toggleProduct(product.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleProduct(product.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{product.title}</h3>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 truncate">
                        /{product.handle}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                          {product.status}
                        </Badge>
                        <span className="font-medium">{formatPrice(product.price)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Selected Count */}
      {selectedProducts.size > 0 && (
        <div className="fixed bottom-6 right-6 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}