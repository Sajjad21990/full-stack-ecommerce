'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Upload,
  Image as ImageIcon,
  Film,
  FileText,
  File,
  Check,
  Loader2,
} from 'lucide-react'
import { getMediaAssets } from '@/lib/admin/queries/media'
import { uploadProductImage } from '@/lib/admin/actions/upload-image'
import { formatFileSize, formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'

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
  createdAt: Date
}

interface MediaPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (urls: string[]) => void
  multiple?: boolean
  maxSelections?: number
  accept?: string[]
  title?: string
  description?: string
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  maxSelections = 10,
  accept = ['image/*'],
  title = 'Select Media',
  description = 'Choose media from your library or upload new files',
}: MediaPickerDialogProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  // Load media when dialog opens
  useEffect(() => {
    if (open) {
      loadMedia()
    } else {
      // Reset state when dialog closes
      setSelectedItems(new Set())
      setSearchQuery('')
      setPage(1)
      setMedia([])
    }
  }, [open])

  // Load media with search
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setPage(1)
        setMedia([])
        loadMedia()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [searchQuery])

  const loadMedia = async () => {
    setLoading(true)
    try {
      const filters = {
        search: searchQuery || undefined,
        mimeType: accept.includes('image/*') ? 'image' : undefined,
        page,
        limit: 24,
        sortBy: 'createdAt' as const,
        sortOrder: 'desc' as const,
      }

      const result = await getMediaAssets(filters)

      if (page === 1) {
        setMedia(result.media)
      } else {
        setMedia((prev) => [...prev, ...result.media])
      }

      setHasMore(result.pagination.page < result.pagination.pages)
    } catch (error) {
      toast.error('Failed to load media')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (files: File[]) => {
    setUploading(true)
    const uploadedUrls: string[] = []

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const result = await uploadProductImage(formData)

        if (result.success && result.url) {
          uploadedUrls.push(result.url)
        } else {
          toast.error(result.error || `Failed to upload ${file.name}`)
        }
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    if (uploadedUrls.length > 0) {
      toast.success(`${uploadedUrls.length} file(s) uploaded successfully`)

      // If in single selection mode, auto-select and close
      if (!multiple && uploadedUrls.length === 1) {
        onSelect(uploadedUrls)
        onOpenChange(false)
      } else {
        // Reload media to show new uploads
        setPage(1)
        setMedia([])
        loadMedia()
        setActiveTab('library')
      }
    }

    setUploading(false)
  }

  const onDrop = async (acceptedFiles: File[]) => {
    const filesToUpload = multiple
      ? acceptedFiles.slice(0, maxSelections)
      : acceptedFiles.slice(0, 1)

    await handleUpload(filesToUpload)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    multiple,
    maxFiles: multiple ? maxSelections : 1,
  })

  const toggleSelection = (url: string) => {
    const newSelection = new Set(selectedItems)

    if (multiple) {
      if (newSelection.has(url)) {
        newSelection.delete(url)
      } else if (newSelection.size < maxSelections) {
        newSelection.add(url)
      }
    } else {
      newSelection.clear()
      newSelection.add(url)
    }

    setSelectedItems(newSelection)
  }

  const handleConfirm = () => {
    onSelect(Array.from(selectedItems))
    onOpenChange(false)
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return ImageIcon
    if (mimeType?.startsWith('video/')) return Film
    if (mimeType === 'application/pdf') return FileText
    return File
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">Media Library</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Media Grid */}
            <ScrollArea className="h-[400px]">
              {loading && media.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : media.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ImageIcon className="mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No media found</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4 p-1">
                  {media.map((item) => {
                    const isSelected = selectedItems.has(item.url)
                    const Icon = getFileIcon(item.mimeType)

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSelection(item.url)}
                        className={`relative cursor-pointer rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        } `}
                      >
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute right-2 top-2 z-10 rounded-full bg-primary p-1 text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </div>
                        )}

                        {/* Preview */}
                        {item.mimeType?.startsWith('image/') ? (
                          <div className="relative aspect-square overflow-hidden rounded-t-md bg-muted">
                            <Image
                              src={item.thumbnailUrl || item.url}
                              alt={item.altText || item.fileName}
                              fill
                              className="object-cover"
                              sizes="200px"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-square items-center justify-center rounded-t-md bg-muted">
                            <Icon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="space-y-1 p-2">
                          <p className="truncate text-xs font-medium">
                            {item.originalFileName || item.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(item.size)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Load More */}
              {hasMore && !loading && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPage((p) => p + 1)
                      loadMedia()
                    }}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </ScrollArea>

            {/* Selection Info */}
            {selectedItems.size > 0 && (
              <div className="flex items-center justify-between border-t pt-2">
                <p className="text-sm text-muted-foreground">
                  {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''}{' '}
                  selected
                  {multiple && ` (max ${maxSelections})`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedItems(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload">
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              } `}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Uploading...</p>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  {isDragActive ? (
                    <p className="text-lg font-medium">Drop files here...</p>
                  ) : (
                    <div>
                      <p className="text-lg font-medium">
                        Drag & drop files here, or click to browse
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {multiple
                          ? `Select up to ${maxSelections} files`
                          : 'Select one file'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedItems.size === 0}>
            Select {selectedItems.size > 0 && `(${selectedItems.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
