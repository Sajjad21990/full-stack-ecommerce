'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Search,
  Upload,
  Image as ImageIcon,
  File,
  Check,
  Loader2,
  Folder,
  ArrowLeft,
  Home,
  Grid3X3,
  List,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/utils'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent } from '@/components/ui/card'
import { uploadProductImage } from '@/lib/admin/actions/upload-image'

interface MediaAsset {
  id: string
  fileName: string
  originalFileName: string
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

interface Folder {
  id: string
  name: string
  path: string
  parentId?: string
  depth: string
  fileCount: number
  subfolderCount: number
  createdAt: Date
}

interface GoogleDriveMediaPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (urls: string[]) => void
  initialMedia: MediaAsset[]
  initialFolders: Folder[]
  multiple?: boolean
  maxSelections?: number
  accept?: string[]
  title?: string
  description?: string
}

type ViewMode = 'grid' | 'list'

export function GoogleDriveMediaPicker({
  open,
  onOpenChange,
  onSelect,
  initialMedia,
  initialFolders,
  multiple = false,
  maxSelections = 10,
  accept = ['image/*'],
  title = 'Select Media',
  description = 'Choose media from your library or upload new files',
}: GoogleDriveMediaPickerProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [currentPath, setCurrentPath] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [uploading, setUploading] = useState(false)

  // Get current folder info
  const currentFolderInfo = useMemo(() => {
    if (!currentPath) return null
    return initialFolders.find((f) => f.path === currentPath)
  }, [currentPath, initialFolders])

  // Get breadcrumb path
  const breadcrumbPath = useMemo(() => {
    if (!currentPath) return [{ name: 'Media Library', path: '' }]

    const parts = currentPath.split('/')
    const breadcrumbs = [{ name: 'Media Library', path: '' }]

    let currentBreadcrumbPath = ''
    for (const part of parts) {
      currentBreadcrumbPath = currentBreadcrumbPath
        ? `${currentBreadcrumbPath}/${part}`
        : part
      const folder = initialFolders.find(
        (f) => f.path === currentBreadcrumbPath
      )
      breadcrumbs.push({
        name: folder?.name || part,
        path: currentBreadcrumbPath,
      })
    }

    return breadcrumbs
  }, [currentPath, initialFolders])

  // Filter and sort items for current folder
  const { folders, files } = useMemo(() => {
    // Get subfolders of current path
    const folders = initialFolders
      .filter((folder) => {
        if (!currentPath) {
          return !folder.parentId
        } else {
          return (
            folder.path.startsWith(currentPath + '/') &&
            folder.path.split('/').length === currentPath.split('/').length + 1
          )
        }
      })
      .filter(
        (folder) =>
          !searchQuery ||
          folder.name.toLowerCase().includes(searchQuery.toLowerCase())
      )

    // Get files in current folder
    const files = initialMedia
      .filter((file) => {
        const fileFolder = file.folder || ''
        return fileFolder === currentPath
      })
      .filter((file) => {
        // Filter by accepted types
        const matchesType = accept.some((acceptType) => {
          if (acceptType === 'image/*')
            return file.mimeType.startsWith('image/')
          if (acceptType === 'video/*')
            return file.mimeType.startsWith('video/')
          return file.mimeType === acceptType
        })

        const matchesSearch =
          !searchQuery ||
          file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.originalFileName
            .toLowerCase()
            .includes(searchQuery.toLowerCase())

        return matchesType && matchesSearch
      })

    return { folders, files }
  }, [initialFolders, initialMedia, currentPath, searchQuery, accept])

  const handleFolderClick = (folderPath: string) => {
    setCurrentPath(folderPath)
    setSelectedItems(new Set())
  }

  const handleBackClick = () => {
    if (!currentPath) return
    const parentPath = currentPath.split('/').slice(0, -1).join('/')
    setCurrentPath(parentPath)
    setSelectedItems(new Set())
  }

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path)
    setSelectedItems(new Set())
  }

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

  const handleUpload = async (files: File[]) => {
    setUploading(true)
    const uploadedUrls: string[] = []

    // Create products folder if we're uploading for products
    const targetFolder = currentPath || 'products'

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', targetFolder)

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
        // Refresh the page to show new uploads
        window.location.reload()
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

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedItems(new Set())
      setSearchQuery('')
      setCurrentPath('')
    }
  }, [open])

  const isImage = (mimeType: string) => mimeType.startsWith('image/')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as any)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="grid w-full flex-shrink-0 grid-cols-2">
            <TabsTrigger value="library">Media Library</TabsTrigger>
            <TabsTrigger value="upload">Upload New</TabsTrigger>
          </TabsList>

          <TabsContent
            value="library"
            className="flex min-h-0 flex-1 flex-col space-y-4"
          >
            {/* Navigation Header */}
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 flex-1 items-center space-x-2">
                {currentPath && (
                  <Button variant="ghost" size="sm" onClick={handleBackClick}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="flex items-center space-x-1 overflow-hidden text-sm text-muted-foreground">
                  {breadcrumbPath.map((crumb, index) => (
                    <div key={index} className="flex items-center space-x-1">
                      {index === 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => handleBreadcrumbClick(crumb.path)}
                        >
                          <Home className="mr-1 h-3 w-3" />
                          {crumb.name}
                        </Button>
                      ) : (
                        <>
                          <span className="text-muted-foreground">/</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => handleBreadcrumbClick(crumb.path)}
                          >
                            {crumb.name}
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Content */}
            <ScrollArea className="max-h-[50vh] min-h-0 flex-1">
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid gap-4 p-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                    : 'space-y-2'
                )}
              >
                {/* Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => handleFolderClick(folder.path)}
                    className={cn(
                      'cursor-pointer rounded-lg border transition-colors hover:bg-muted/50',
                      viewMode === 'grid' ? 'p-4' : 'flex items-center p-3'
                    )}
                  >
                    {viewMode === 'grid' ? (
                      <div className="flex flex-col items-center space-y-2">
                        <Folder className="h-12 w-12 text-blue-500" />
                        <div className="space-y-1 text-center">
                          <p className="truncate text-sm font-medium">
                            {folder.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {folder.fileCount + folder.subfolderCount} item
                            {folder.fileCount + folder.subfolderCount !== 1
                              ? 's'
                              : ''}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Folder className="mr-3 h-8 w-8 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {folder.fileCount} files, {folder.subfolderCount}{' '}
                            folders
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Files */}
                {files.map((file) => {
                  const isSelected = selectedItems.has(file.url)
                  const isImageFile = isImage(file.mimeType)

                  return (
                    <div
                      key={file.id}
                      onClick={() => toggleSelection(file.url)}
                      className={cn(
                        'relative cursor-pointer rounded-lg border-2 transition-all',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50',
                        viewMode === 'grid' ? '' : 'flex items-center p-3'
                      )}
                    >
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute right-2 top-2 z-10 rounded-full bg-primary p-1 text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}

                      {viewMode === 'grid' ? (
                        <>
                          {/* Preview */}
                          {isImageFile && file.thumbnailUrl ? (
                            <div className="relative aspect-square overflow-hidden rounded-t-md bg-muted">
                              <Image
                                src={file.thumbnailUrl}
                                alt={file.altText || file.fileName}
                                fill
                                className="object-cover"
                                sizes="200px"
                              />
                            </div>
                          ) : (
                            <div className="flex aspect-square items-center justify-center rounded-t-md bg-muted">
                              <File className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="space-y-1 p-2">
                            <p className="truncate text-xs font-medium">
                              {file.originalFileName || file.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          {isImageFile && file.thumbnailUrl ? (
                            <div className="relative mr-3 h-8 w-8 overflow-hidden rounded bg-muted">
                              <Image
                                src={file.thumbnailUrl}
                                alt={file.altText || file.fileName}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <File className="mr-3 h-8 w-8 text-muted-foreground" />
                          )}
                          <div className="flex-1">
                            <p className="truncate text-sm font-medium">
                              {file.originalFileName || file.fileName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} •{' '}
                              {file.mimeType.split('/')[1]?.toUpperCase()}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Empty State */}
              {folders.length === 0 && files.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? 'No files or folders match your search.'
                      : 'This folder is empty.'}
                  </p>
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

          <TabsContent value="upload" className="flex-1">
            <div className="flex h-full flex-col space-y-4">
              {/* Upload destination info */}
              <div className="text-sm text-muted-foreground">
                Files will be uploaded to:{' '}
                <Badge variant="secondary">{currentPath || 'products'}</Badge>
              </div>

              {/* Upload area */}
              <div
                {...getRootProps()}
                className={`flex flex-1 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
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
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex-shrink-0">
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
