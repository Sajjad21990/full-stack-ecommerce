'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { MoreHorizontal, Download, Edit, Trash2, Eye, Copy, FolderOpen, FileText, Film, File } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Pagination } from '@/components/ui/pagination'
import { formatFileSize, formatDate } from '@/lib/utils'
import { deleteMedia, bulkDeleteMedia } from '@/lib/admin/actions/media'
import { toast } from 'sonner'

interface MediaAsset {
  id: string
  fileName: string
  originalFileName?: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  altText?: string
  folder?: string
  tags?: string[]
  usageCount: number
  createdAt: Date
}

interface MediaLibraryProps {
  media: MediaAsset[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  currentFilters: any
  stats: {
    totalFiles: number
    totalSize: number
    byMimeType: Record<string, number>
    byFolder: Record<string, number>
  }
}

export function MediaLibrary({ media, pagination, currentFilters, stats }: MediaLibraryProps) {
  const router = useRouter()
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  const handleSelectAll = () => {
    if (selectedItems.size === media.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(media.map(item => item.id)))
    }
  }

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return
    }

    setLoadingId(id)
    try {
      const result = await deleteMedia(id)
      if (result.success) {
        toast.success('Media file deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete media file')
      }
    } catch (error) {
      toast.error('Failed to delete media file')
    } finally {
      setLoadingId(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedItems.size} file(s)? This action cannot be undone.`)) {
      return
    }

    setBulkLoading(true)
    try {
      const result = await bulkDeleteMedia(Array.from(selectedItems))
      if (result.success) {
        toast.success(`${result.deletedCount} files deleted successfully`)
        setSelectedItems(new Set())
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete files')
      }
    } catch (error) {
      toast.error('Failed to delete files')
    } finally {
      setBulkLoading(false)
    }
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('URL copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy URL')
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return null // We'll show the actual image
    }
    if (mimeType.startsWith('video/')) {
      return Film
    }
    if (mimeType === 'application/pdf') {
      return FileText
    }
    return File
  }

  const renderMediaPreview = (item: MediaAsset) => {
    const Icon = getFileIcon(item.mimeType)

    if (item.mimeType.startsWith('image/')) {
      return (
        <div className="relative w-full h-32 bg-gray-100 rounded-t-lg overflow-hidden">
          <Image
            src={item.thumbnailUrl || item.url}
            alt={item.altText || item.fileName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
          {item.width && item.height && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
              {item.width}×{item.height}
            </div>
          )}
        </div>
      )
    }

    if (Icon) {
      return (
        <div className="flex items-center justify-center w-full h-32 bg-gray-100 rounded-t-lg">
          <Icon className="h-12 w-12 text-gray-400" />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center w-full h-32 bg-gray-100 rounded-t-lg">
        <File className="h-12 w-12 text-gray-400" />
      </div>
    )
  }

  if (media.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">No media files</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload some files to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {bulkLoading ? 'Deleting...' : 'Delete Selected'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedItems(new Set())}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Select All */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={selectedItems.size === media.length && media.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <label className="text-sm font-medium">
            Select all {media.length} items
          </label>
        </div>
        <div className="text-sm text-muted-foreground">
          {pagination.total} total files ({formatFileSize(stats.totalSize)})
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {media.map((item) => (
          <Card 
            key={item.id} 
            className={`relative group hover:shadow-md transition-shadow ${
              selectedItems.has(item.id) ? 'ring-2 ring-primary' : ''
            }`}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedItems.has(item.id)}
                onCheckedChange={() => handleSelectItem(item.id)}
                className="bg-white shadow-sm"
              />
            </div>

            {/* Actions Menu */}
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 bg-white shadow-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.open(item.url, '_blank')}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyUrl(item.url)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy URL
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(item.url, '_blank')}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDelete(item.id, item.fileName)}
                    disabled={loadingId === item.id}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <CardContent className="p-0">
              {/* Media Preview */}
              {renderMediaPreview(item)}

              {/* Media Info */}
              <div className="p-3 space-y-2">
                <h3 className="font-medium text-sm truncate" title={item.fileName}>
                  {item.originalFileName || item.fileName}
                </h3>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(item.size)}</span>
                  <span>{item.mimeType.split('/')[1]?.toUpperCase()}</span>
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        +{item.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Used {item.usageCount}x</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            onPageChange={(page) => {
              const params = new URLSearchParams()
              Object.entries(currentFilters).forEach(([key, value]) => {
                if (value && key !== 'page') {
                  params.set(key, value.toString())
                }
              })
              params.set('page', page.toString())
              router.push(`?${params.toString()}`)
            }}
          />
        </div>
      )}
    </div>
  )
}