'use client'

import { useState, useEffect } from 'react'
import { Check, X, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ProductSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
}

export default function ProductSelector({ value, onChange }: ProductSelectorProps) {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // TODO: Fetch products from API
    setProducts([
      { id: '1', title: 'Product 1', handle: 'product-1' },
      { id: '2', title: 'Product 2', handle: 'product-2' },
      { id: '3', title: 'Product 3', handle: 'product-3' },
    ])
  }, [])

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(search.toLowerCase())
  )

  const toggleProduct = (productId: string) => {
    if (value.includes(productId)) {
      onChange(value.filter(id => id !== productId))
    } else {
      onChange([...value, productId])
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(productId => {
            const product = products.find(p => p.id === productId)
            if (!product) return null
            return (
              <Badge key={productId} variant="secondary">
                {product.title}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-2"
                  onClick={() => toggleProduct(productId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )
          })}
        </div>
      )}

      <ScrollArea className="h-48 border rounded-md p-2">
        <div className="space-y-1">
          {filteredProducts.map(product => (
            <div
              key={product.id}
              className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
              onClick={() => toggleProduct(product.id)}
            >
              <span className="text-sm">{product.title}</span>
              {value.includes(product.id) && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}