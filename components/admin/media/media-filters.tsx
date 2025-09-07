'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, X, Folder, Tag } from 'lucide-react'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'

interface MediaFiltersProps {
  folders: string[]
  tags: string[]
}

export function MediaFilters({ folders, tags }: MediaFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  
  const updateFilters = (key: string, value: string | string[]) => {
    const params = new URLSearchParams(searchParams)
    
    if (Array.isArray(value)) {
      if (value.length > 0) {
        params.set(key, value.join(','))
      } else {
        params.delete(key)
      }
    } else if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters('search', search)
  }

  const clearFilters = () => {
    setSearch('')
    router.push('/admin/media')
  }

  const currentTags = searchParams.get('tags')?.split(',').filter(Boolean) || []
  const folder = searchParams.get('folder')
  const mimeType = searchParams.get('mimeType')
  const hasActiveFilters = search || folder || mimeType || currentTags.length > 0

  const toggleTag = (tag: string) => {
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    updateFilters('tags', newTags)
  }

  return (
    <div className="space-y-4">
      {/* Main Filters Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </form>

        {/* Folder Filter */}
        <Select 
          value={folder || 'all'} 
          onValueChange={(value) => updateFilters('folder', value)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              <SelectValue placeholder="All folders" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All folders</SelectItem>
            <SelectItem value="root">Root folder</SelectItem>
            {folders.map((folder) => (
              <SelectItem key={folder} value={folder}>
                {folder}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* File Type Filter */}
        <Select 
          value={mimeType || 'all'} 
          onValueChange={(value) => updateFilters('mimeType', value)}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image/jpeg">JPEG</SelectItem>
            <SelectItem value="image/png">PNG</SelectItem>
            <SelectItem value="image/webp">WebP</SelectItem>
            <SelectItem value="image/gif">GIF</SelectItem>
            <SelectItem value="video/mp4">MP4</SelectItem>
            <SelectItem value="application/pdf">PDF</SelectItem>
          </SelectContent>
        </Select>

        {/* Tags Filter */}
        {tags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Tag className="mr-2 h-4 w-4" />
                Tags
                {currentTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {currentTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Filter by tags</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tags.map((tag) => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={currentTags.includes(tag)}
                        onCheckedChange={() => toggleTag(tag)}
                      />
                      <label 
                        htmlFor={`tag-${tag}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {tag}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            Clear
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
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {folder && folder !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Folder: {folder === 'root' ? 'Root' : folder}
              <button
                onClick={() => updateFilters('folder', '')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {mimeType && mimeType !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Type: {mimeType.split('/')[1]?.toUpperCase()}
              <button
                onClick={() => updateFilters('mimeType', '')}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {currentTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button
                onClick={() => toggleTag(tag)}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}