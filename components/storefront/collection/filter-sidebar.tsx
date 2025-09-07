'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { formatPrice } from '@/lib/storefront/utils'

interface FilterSidebarProps {
  currentFilters: any
  products: any[]
}

export function FilterSidebar({ currentFilters, products }: FilterSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedSections, setExpandedSections] = useState<string[]>(['price', 'availability'])
  
  // Extract unique vendors and types from products
  const vendors = [...new Set(products.map(p => p.vendor).filter(Boolean))]
  const productTypes = [...new Set(products.map(p => p.productType).filter(Boolean))]
  
  // Price range
  const prices = products.map(p => p.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  
  const [priceRange, setPriceRange] = useState([
    currentFilters.minPrice || minPrice,
    currentFilters.maxPrice || maxPrice
  ])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Update price range
    if (priceRange[0] > minPrice) {
      params.set('minPrice', priceRange[0].toString())
    } else {
      params.delete('minPrice')
    }
    
    if (priceRange[1] < maxPrice) {
      params.set('maxPrice', priceRange[1].toString())
    } else {
      params.delete('maxPrice')
    }
    
    // Reset to page 1 when filters change
    params.delete('page')
    
    router.push(`?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push(window.location.pathname)
  }

  const updateVendor = (vendor: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    const currentVendors = params.getAll('vendor')
    
    if (checked && !currentVendors.includes(vendor)) {
      params.append('vendor', vendor)
    } else if (!checked) {
      params.delete('vendor')
      currentVendors.filter(v => v !== vendor).forEach(v => params.append('vendor', v))
    }
    
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  const updateType = (type: string, checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    const currentTypes = params.getAll('type')
    
    if (checked && !currentTypes.includes(type)) {
      params.append('type', type)
    } else if (!checked) {
      params.delete('type')
      currentTypes.filter(t => t !== type).forEach(t => params.append('type', t))
    }
    
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  const updateInStock = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (checked) {
      params.set('inStock', 'true')
    } else {
      params.delete('inStock')
    }
    
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-sm"
        >
          Clear all
        </Button>
      </div>

      {/* Price Range */}
      <div className="border-b pb-6 mb-6">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium">Price</span>
          {expandedSections.includes('price') ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.includes('price') && (
          <div className="mt-4 space-y-4">
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              min={minPrice}
              max={maxPrice}
              step={100}
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm">
              <span>{formatPrice(priceRange[0])}</span>
              <span>{formatPrice(priceRange[1])}</span>
            </div>
            <Button
              onClick={applyFilters}
              size="sm"
              className="w-full"
            >
              Apply Price Filter
            </Button>
          </div>
        )}
      </div>

      {/* Availability */}
      <div className="border-b pb-6 mb-6">
        <button
          onClick={() => toggleSection('availability')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="font-medium">Availability</span>
          {expandedSections.includes('availability') ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {expandedSections.includes('availability') && (
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="in-stock"
                checked={currentFilters.inStock}
                onCheckedChange={updateInStock}
              />
              <Label htmlFor="in-stock" className="text-sm cursor-pointer">
                In Stock Only
              </Label>
            </div>
          </div>
        )}
      </div>

      {/* Vendors */}
      {vendors.length > 0 && (
        <div className="border-b pb-6 mb-6">
          <button
            onClick={() => toggleSection('vendor')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium">Brand</span>
            {expandedSections.includes('vendor') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.includes('vendor') && (
            <div className="mt-4 space-y-2">
              {vendors.map(vendor => (
                <div key={vendor} className="flex items-center space-x-2">
                  <Checkbox
                    id={`vendor-${vendor}`}
                    checked={currentFilters.vendor?.includes(vendor)}
                    onCheckedChange={(checked) => updateVendor(vendor, checked as boolean)}
                  />
                  <Label htmlFor={`vendor-${vendor}`} className="text-sm cursor-pointer">
                    {vendor}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Types */}
      {productTypes.length > 0 && (
        <div className="pb-6">
          <button
            onClick={() => toggleSection('type')}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="font-medium">Product Type</span>
            {expandedSections.includes('type') ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          
          {expandedSections.includes('type') && (
            <div className="mt-4 space-y-2">
              {productTypes.map(type => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={currentFilters.productType?.includes(type)}
                    onCheckedChange={(checked) => updateType(type, checked as boolean)}
                  />
                  <Label htmlFor={`type-${type}`} className="text-sm cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}