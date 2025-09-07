'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatPrice } from '@/lib/storefront/utils'
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchFiltersProps {
  searchParams: {
    q?: string
    category?: string[]
    minPrice?: string
    maxPrice?: string
    brand?: string[]
    inStock?: string
    sortBy?: string
    page?: string
  }
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'title-asc', label: 'Name: A to Z' },
  { value: 'title-desc', label: 'Name: Z to A' },
  { value: 'created-desc', label: 'Newest First' },
  { value: 'created-asc', label: 'Oldest First' },
]

// Mock data - in real app, fetch from API
const AVAILABLE_CATEGORIES = [
  'Clothing', 'Electronics', 'Books', 'Home & Garden', 'Sports', 'Beauty'
]

const AVAILABLE_BRANDS = [
  'Nike', 'Adidas', 'Apple', 'Samsung', 'Sony', 'LG', 'Generic'
]

export function SearchFilters({ searchParams }: SearchFiltersProps) {
  const router = useRouter()
  const urlSearchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const [localFilters, setLocalFilters] = useState({
    minPrice: searchParams.minPrice || '',
    maxPrice: searchParams.maxPrice || '',
    categories: Array.isArray(searchParams.category) ? searchParams.category : (searchParams.category ? [searchParams.category] : []),
    brands: Array.isArray(searchParams.brand) ? searchParams.brand : (searchParams.brand ? [searchParams.brand] : []),
    inStock: searchParams.inStock === 'true',
    sortBy: searchParams.sortBy || 'relevance'
  })

  const updateURL = (newFilters: typeof localFilters) => {
    const params = new URLSearchParams(urlSearchParams.toString())
    
    // Keep the search query
    if (searchParams.q) {
      params.set('q', searchParams.q)
    }
    
    // Update filters
    if (newFilters.minPrice) {
      params.set('minPrice', newFilters.minPrice)
    } else {
      params.delete('minPrice')
    }
    
    if (newFilters.maxPrice) {
      params.set('maxPrice', newFilters.maxPrice)
    } else {
      params.delete('maxPrice')
    }
    
    params.delete('category')
    newFilters.categories.forEach(category => {
      params.append('category', category)
    })
    
    params.delete('brand')
    newFilters.brands.forEach(brand => {
      params.append('brand', brand)
    })
    
    if (newFilters.inStock) {
      params.set('inStock', 'true')
    } else {
      params.delete('inStock')
    }
    
    if (newFilters.sortBy !== 'relevance') {
      params.set('sortBy', newFilters.sortBy)
    } else {
      params.delete('sortBy')
    }
    
    // Reset to first page
    params.delete('page')
    
    router.push(`/search?${params.toString()}`)
  }

  const applyFilters = () => {
    updateURL(localFilters)
    setIsOpen(false)
  }

  const clearAllFilters = () => {
    const clearedFilters = {
      minPrice: '',
      maxPrice: '',
      categories: [],
      brands: [],
      inStock: false,
      sortBy: 'relevance'
    }
    setLocalFilters(clearedFilters)
    updateURL(clearedFilters)
  }

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const activeFiltersCount = 
    (localFilters.minPrice ? 1 : 0) +
    (localFilters.maxPrice ? 1 : 0) +
    localFilters.categories.length +
    localFilters.brands.length +
    (localFilters.inStock ? 1 : 0) +
    (localFilters.sortBy !== 'relevance' ? 1 : 0)

  const FilterSection = ({ title, section, children }: { title: string, section: string, children: React.ReactNode }) => (
    <div className="space-y-3">
      <button
        onClick={() => toggleSection(section)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="font-medium text-gray-900">{title}</h3>
        {collapsedSections[section] ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {!collapsedSections[section] && (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Sort */}
        <FilterSection title="Sort By" section="sort">
          <div className="space-y-2">
            {SORT_OPTIONS.map(option => (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value={option.value}
                  checked={localFilters.sortBy === option.value}
                  onChange={(e) => {
                    const newFilters = { ...localFilters, sortBy: e.target.value }
                    setLocalFilters(newFilters)
                    updateURL(newFilters)
                  }}
                  className="text-black focus:ring-black"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        <Separator />

        {/* Price Range */}
        <FilterSection title="Price Range" section="price">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="minPrice" className="text-xs">Min</Label>
              <Input
                id="minPrice"
                type="number"
                placeholder="0"
                value={localFilters.minPrice}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="maxPrice" className="text-xs">Max</Label>
              <Input
                id="maxPrice"
                type="number"
                placeholder="∞"
                value={localFilters.maxPrice}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Button 
            size="sm" 
            onClick={applyFilters}
            className="w-full mt-2"
          >
            Apply Price Filter
          </Button>
        </FilterSection>

        <Separator />

        {/* Categories */}
        <FilterSection title="Categories" section="categories">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {AVAILABLE_CATEGORIES.map(category => (
              <label key={category} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={localFilters.categories.includes(category)}
                  onCheckedChange={(checked) => {
                    const newCategories = checked
                      ? [...localFilters.categories, category]
                      : localFilters.categories.filter(c => c !== category)
                    const newFilters = { ...localFilters, categories: newCategories }
                    setLocalFilters(newFilters)
                    updateURL(newFilters)
                  }}
                />
                <span className="text-sm">{category}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        <Separator />

        {/* Brands */}
        <FilterSection title="Brands" section="brands">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {AVAILABLE_BRANDS.map(brand => (
              <label key={brand} className="flex items-center space-x-2 cursor-pointer">
                <Checkbox
                  checked={localFilters.brands.includes(brand)}
                  onCheckedChange={(checked) => {
                    const newBrands = checked
                      ? [...localFilters.brands, brand]
                      : localFilters.brands.filter(b => b !== brand)
                    const newFilters = { ...localFilters, brands: newBrands }
                    setLocalFilters(newFilters)
                    updateURL(newFilters)
                  }}
                />
                <span className="text-sm">{brand}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        <Separator />

        {/* Availability */}
        <FilterSection title="Availability" section="availability">
          <label className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
              checked={localFilters.inStock}
              onCheckedChange={(checked) => {
                const newFilters = { ...localFilters, inStock: !!checked }
                setLocalFilters(newFilters)
                updateURL(newFilters)
              }}
            />
            <span className="text-sm">In Stock Only</span>
          </label>
        </FilterSection>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Active Filters</h3>
              <div className="flex flex-wrap gap-1">
                {localFilters.categories.map(category => (
                  <Badge key={category} variant="secondary" className="text-xs">
                    {category}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer" 
                      onClick={() => {
                        const newCategories = localFilters.categories.filter(c => c !== category)
                        const newFilters = { ...localFilters, categories: newCategories }
                        setLocalFilters(newFilters)
                        updateURL(newFilters)
                      }}
                    />
                  </Badge>
                ))}
                {localFilters.brands.map(brand => (
                  <Badge key={brand} variant="secondary" className="text-xs">
                    {brand}
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => {
                        const newBrands = localFilters.brands.filter(b => b !== brand)
                        const newFilters = { ...localFilters, brands: newBrands }
                        setLocalFilters(newFilters)
                        updateURL(newFilters)
                      }}
                    />
                  </Badge>
                ))}
                {localFilters.inStock && (
                  <Badge variant="secondary" className="text-xs">
                    In Stock
                    <X 
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => {
                        const newFilters = { ...localFilters, inStock: false }
                        setLocalFilters(newFilters)
                        updateURL(newFilters)
                      }}
                    />
                  </Badge>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full h-12 w-12 shadow-lg"
          size="icon"
        >
          <Filter className="h-5 w-5" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile Filter Modal */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Mobile filter content would go here - similar to desktop but optimized for mobile */}
              <div className="text-center text-gray-500">
                Mobile filter interface coming soon...
              </div>
            </div>
            
            <div className="p-4 border-t flex gap-2">
              <Button
                variant="outline"
                onClick={clearAllFilters}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button
                onClick={applyFilters}
                className="flex-1"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}