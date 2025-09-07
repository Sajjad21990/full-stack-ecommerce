'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice, calculateDiscount, getStockStatus, getStockStatusColor } from '@/lib/storefront/utils'
import { addToCart } from '@/lib/storefront/actions/cart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProductVariants } from './product-variants'
import { toast } from 'sonner'
import { 
  ShoppingCart, 
  Heart, 
  Share2, 
  Truck, 
  Shield, 
  RefreshCw,
  Minus,
  Plus,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductInfoProps {
  product: any // Will type this properly later
}

export function ProductInfo({ product }: ProductInfoProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [quantity, setQuantity] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants?.[0] || null
  )
  const [isWishlisted, setIsWishlisted] = useState(false)

  const currentPrice = selectedVariant?.price || product.price
  const compareAtPrice = selectedVariant?.compareAtPrice || product.compareAtPrice
  const discount = calculateDiscount(currentPrice, compareAtPrice)
  const inStock = selectedVariant ? selectedVariant.inventoryQuantity > 0 : false
  const stockStatus = selectedVariant ? getStockStatus(selectedVariant.inventoryQuantity) : 'Out of Stock'
  const stockStatusColor = selectedVariant ? getStockStatusColor(selectedVariant.inventoryQuantity) : 'text-red-600'

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error('Please select a variant')
      return
    }

    if (!inStock) {
      toast.error('This product is out of stock')
      return
    }

    startTransition(async () => {
      const result = await addToCart(
        product.id,
        selectedVariant.id,
        quantity
      )

      if (result.success) {
        toast.success(result.message || 'Added to cart', {
          action: {
            label: 'View Cart',
            onClick: () => router.push('/cart')
          }
        })
      } else {
        toast.error(result.error || 'Failed to add to cart')
      }
    })
  }

  const handleQuantityChange = (value: number) => {
    const maxQuantity = selectedVariant?.inventoryQuantity || 1
    const newQuantity = Math.max(1, Math.min(value, maxQuantity))
    setQuantity(newQuantity)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: product.description,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    }
  }

  return (
    <div className="space-y-6">
      {/* Title and Brand */}
      <div>
        {product.vendor && (
          <p className="text-sm text-gray-500 uppercase tracking-wide mb-1">
            {product.vendor}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {product.title}
        </h1>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-900">
          {formatPrice(currentPrice)}
        </span>
        {compareAtPrice && compareAtPrice > currentPrice && (
          <>
            <span className="text-xl text-gray-500 line-through">
              {formatPrice(compareAtPrice)}
            </span>
            {discount && (
              <span className="px-2 py-1 text-sm font-medium text-green-700 bg-green-100 rounded">
                {discount}% OFF
              </span>
            )}
          </>
        )}
      </div>

      {/* Stock Status */}
      <div className="flex items-center gap-2">
        <div className={cn("text-sm font-medium", stockStatusColor)}>
          {inStock ? (
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4" />
              {stockStatus}
            </span>
          ) : (
            stockStatus
          )}
        </div>
      </div>

      {/* Variant Selection */}
      {product.options && product.options.length > 0 && (
        <ProductVariants
          options={product.options}
          variants={product.variants || []}
          onVariantChange={(variant) => setSelectedVariant(variant)}
          initialVariant={selectedVariant}
        />
      )}

      {/* Quantity Selector */}
      <div className="space-y-3">
        <Label>Quantity</Label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </button>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
            className="w-20 text-center"
            min="1"
            max={selectedVariant?.inventoryQuantity || 1}
          />
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={quantity >= (selectedVariant?.inventoryQuantity || 1)}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={handleAddToCart}
          disabled={!inStock || isPending}
          className="flex-1 h-12 text-base font-medium"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Adding...
            </span>
          ) : (
            <>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Add to Cart
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12"
          onClick={() => setIsWishlisted(!isWishlisted)}
        >
          <Heart className={cn("h-5 w-5", isWishlisted && "fill-red-500 text-red-500")} />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className="h-12 w-12"
          onClick={handleShare}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t">
        <div className="flex items-center gap-3">
          <Truck className="h-5 w-5 text-gray-600" />
          <div>
            <p className="text-sm font-medium">Free Shipping</p>
            <p className="text-xs text-gray-500">On orders over ₹999</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-gray-600" />
          <div>
            <p className="text-sm font-medium">Secure Payment</p>
            <p className="text-xs text-gray-500">100% secure checkout</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RefreshCw className="h-5 w-5 text-gray-600" />
          <div>
            <p className="text-sm font-medium">Easy Returns</p>
            <p className="text-xs text-gray-500">30-day return policy</p>
          </div>
        </div>
      </div>

      {/* Product Type and Tags */}
      {(product.productType || product.tags?.length > 0) && (
        <div className="pt-4 border-t space-y-2">
          {product.productType && (
            <p className="text-sm">
              <span className="text-gray-500">Category:</span>{' '}
              <span className="font-medium">{product.productType}</span>
            </p>
          )}
          {product.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}