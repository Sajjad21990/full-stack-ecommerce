'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, X, Loader2 } from 'lucide-react'
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
import { useDebounce } from '@/hooks/use-debounce'

export function ProductsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [isSearching, setIsSearching] = useState(false)

  // Debounced search value for real-time search
  const debouncedSearch = useDebounce(search, 500)

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams)

      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }

      // Reset to first page when filters change
      params.delete('page')

      router.push(`?${params.toString()}`)
    },
    [searchParams, router]
  )

  // Auto-search when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== searchParams.get('search')) {
      setIsSearching(true)
      updateFilters('search', debouncedSearch)
      // Reset loading state after navigation
      setTimeout(() => setIsSearching(false), 500)
    }
  }, [debouncedSearch, searchParams, updateFilters])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Search is already handled by the debounced effect
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    router.push('/admin/products')
  }

  const hasActiveFilters = search || status

  return (
    <div className="space-y-4">
      {/* Search and Status Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            {isSearching ? (
              <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : (
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            )}
            <Input
              placeholder="Search by title, SKU, vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {/* Status Filter */}
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            updateFilters('status', value)
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
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
                className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {status && (
            <Badge variant="secondary" className="gap-1">
              Status: {status}
              <button
                onClick={() => {
                  setStatus('')
                  updateFilters('status', '')
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/20"
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
