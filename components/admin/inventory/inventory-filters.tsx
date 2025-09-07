'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, X, AlertTriangle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

interface InventoryFiltersProps {
  locations: any[]
}

export function InventoryFilters({ locations }: InventoryFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [locationId, setLocationId] = useState(searchParams.get('locationId') || '')
  const [lowStock, setLowStock] = useState(searchParams.get('lowStock') === 'true')
  const [outOfStock, setOutOfStock] = useState(searchParams.get('outOfStock') === 'true')
  
  const updateFilters = (key: string, value: string | boolean) => {
    const params = new URLSearchParams(searchParams)
    
    if (value && value !== 'all' && value !== false) {
      params.set(key, value.toString())
    } else {
      params.delete(key)
    }
    
    // Reset to first page when filters change
    params.delete('page')
    
    router.push(`?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters('search', search)
  }

  const clearFilters = () => {
    setSearch('')
    setLocationId('')
    setLowStock(false)
    setOutOfStock(false)
    router.push('/admin/inventory')
  }

  const hasActiveFilters = search || locationId || lowStock || outOfStock

  return (
    <div className="space-y-4">
      {/* Search and Location Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products, SKUs, or variants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </form>

        {/* Location Filter */}
        <Select value={locationId} onValueChange={(value) => {
          setLocationId(value)
          updateFilters('locationId', value)
        }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Stock Status Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">
          Stock status:
        </span>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="low-stock"
            checked={lowStock}
            onCheckedChange={(checked) => {
              setLowStock(checked as boolean)
              updateFilters('lowStock', checked as boolean)
            }}
          />
          <label 
            htmlFor="low-stock" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            <Badge variant="secondary" className="text-orange-600">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Low Stock
            </Badge>
          </label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="out-of-stock"
            checked={outOfStock}
            onCheckedChange={(checked) => {
              setOutOfStock(checked as boolean)
              updateFilters('outOfStock', checked as boolean)
            }}
          />
          <label 
            htmlFor="out-of-stock" 
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            <Badge variant="destructive">
              <Package className="mr-1 h-3 w-3" />
              Out of Stock
            </Badge>
          </label>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Active filters:
          </span>
          {search && (
            <Badge variant="secondary" className="gap-1">
              Search: {search}
              <button
                onClick={() => {
                  setSearch('')
                  updateFilters('search', '')
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {locationId && (
            <Badge variant="secondary" className="gap-1">
              Location: {locations.find(l => l.id === locationId)?.name}
              <button
                onClick={() => {
                  setLocationId('')
                  updateFilters('locationId', '')
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {lowStock && (
            <Badge variant="secondary" className="gap-1">
              Low Stock
              <button
                onClick={() => {
                  setLowStock(false)
                  updateFilters('lowStock', false)
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {outOfStock && (
            <Badge variant="secondary" className="gap-1">
              Out of Stock
              <button
                onClick={() => {
                  setOutOfStock(false)
                  updateFilters('outOfStock', false)
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}