'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Folder,
  Image,
  FileText,
  Upload,
  Plus,
  ArrowLeft,
  Home,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Edit3,
  Grid3X3,
  List,
  Search,
  SortAsc,
  SortDesc,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/utils'
import NextImage from 'next/image'
import { MediaUpload } from './media-upload'
import { NewFolderDialog } from './new-folder-dialog'

interface MediaFile {
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
  createdAt: Date
  updatedAt: Date
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

interface GoogleDriveMediaProps {
  initialMedia: MediaFile[]
  initialFolders: Folder[]
  currentFolder?: string
}

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'
type SortOrder = 'asc' | 'desc'

// Helper functions
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image
  return FileText
}

const isImage = (mimeType: string) => mimeType.startsWith('image/')

export function GoogleDriveMedia({
  initialMedia,
  initialFolders,
  currentFolder = '',
}: GoogleDriveMediaProps) {
  const [currentPath, setCurrentPath] = useState<string>(currentFolder)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showUpload, setShowUpload] = useState(false)
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [previewImage, setPreviewImage] = useState<MediaFile | null>(null)

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
          // Root level - folders with no parent or parent is null
          return !folder.parentId
        } else {
          // Check if folder's parent path matches current path
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
      .filter(
        (file) =>
          !searchQuery ||
          file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          file.originalFileName
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )

    // Sort folders
    const sortedFolders = [...folders].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        default:
          comparison = a.name.localeCompare(b.name)
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    // Sort files
    const sortedFiles = [...files].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.fileName.localeCompare(b.fileName)
          break
        case 'date':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'type':
          comparison = a.mimeType.localeCompare(b.mimeType)
          break
        default:
          comparison = a.fileName.localeCompare(b.fileName)
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return { folders: sortedFolders, files: sortedFiles }
  }, [
    initialFolders,
    initialMedia,
    currentPath,
    searchQuery,
    sortBy,
    sortOrder,
  ])

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

  const handleItemSelect = (id: string, isSelected: boolean) => {
    const newSelected = new Set(selectedItems)
    if (isSelected) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumbs */}
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload(true)}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <NewFolderDialog
            currentFolder={currentPath}
            onSuccess={() => window.location.reload()}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-md">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files and folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort: {sortBy}
                {sortOrder === 'desc' ? (
                  <SortDesc className="ml-1 h-3 w-3" />
                ) : (
                  <SortAsc className="ml-1 h-3 w-3" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setSortBy('name')}>
                Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('date')}>
                Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('size')}>
                Size {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('type')}>
                Type {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                }
              >
                {sortOrder === 'asc' ? 'Descending' : 'Ascending'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Selected Items Actions */}
      {selectedItems.size > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">
            {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}{' '}
            selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Content Grid/List */}
      <div
        className={cn(
          viewMode === 'grid'
            ? 'grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8'
            : 'space-y-2'
        )}
      >
        {/* Folders */}
        {folders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            viewMode={viewMode}
            isSelected={selectedItems.has(folder.id)}
            onSelect={(selected) => handleItemSelect(folder.id, selected)}
            onClick={() => handleFolderClick(folder.path)}
          />
        ))}

        {/* Files */}
        {files.map((file) => (
          <FileItem
            key={file.id}
            file={file}
            viewMode={viewMode}
            isSelected={selectedItems.has(file.id)}
            onSelect={(selected) => handleItemSelect(file.id, selected)}
            onPreview={() => setPreviewImage(file)}
          />
        ))}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Files to {currentPath || 'Root'}</DialogTitle>
          </DialogHeader>
          <MediaUpload
            currentFolder={currentPath}
            onComplete={() => {
              setShowUpload(false)
              window.location.reload()
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      {previewImage && (
        <Dialog
          open={!!previewImage}
          onOpenChange={() => setPreviewImage(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{previewImage.originalFileName}</DialogTitle>
            </DialogHeader>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <NextImage
                src={previewImage.url}
                alt={previewImage.altText || previewImage.fileName}
                fill
                className="object-contain"
              />
            </div>
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                {formatFileSize(previewImage.size)} • {previewImage.mimeType}
                {previewImage.width && previewImage.height && (
                  <>
                    {' '}
                    • {previewImage.width} × {previewImage.height}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" size="sm">
                  <Edit3 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Empty State */}
      {folders.length === 0 && files.length === 0 && (
        <div className="py-12 text-center">
          <Folder className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No items found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? 'No files or folders match your search.'
              : 'This folder is empty. Upload some files or create a subfolder.'}
          </p>
        </div>
      )}
    </div>
  )
}

// Individual components for folders and files
function FolderItem({
  folder,
  viewMode,
  isSelected,
  onSelect,
  onClick,
}: {
  folder: Folder
  viewMode: ViewMode
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onClick: () => void
}) {
  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50',
          isSelected && 'border-primary bg-primary/10'
        )}
      >
        <div className="flex flex-1 items-center space-x-3" onClick={onClick}>
          <Folder className="h-8 w-8 flex-shrink-0 text-blue-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{folder.name}</p>
            <p className="text-xs text-muted-foreground">
              {folder.fileCount} file{folder.fileCount !== 1 ? 's' : ''} •{' '}
              {folder.subfolderCount} folder
              {folder.subfolderCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Edit3 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-2">
          <div className="relative">
            <Folder className="h-12 w-12 text-blue-500" />
            {isSelected && (
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                <span className="text-xs text-primary-foreground">✓</span>
              </div>
            )}
          </div>
          <div className="space-y-1 text-center">
            <p className="max-w-full truncate text-sm font-medium">
              {folder.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {folder.fileCount + folder.subfolderCount} item
              {folder.fileCount + folder.subfolderCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Edit3 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

function FileItem({
  file,
  viewMode,
  isSelected,
  onSelect,
  onPreview,
}: {
  file: MediaFile
  viewMode: ViewMode
  isSelected: boolean
  onSelect: (selected: boolean) => void
  onPreview: () => void
}) {
  const Icon = getFileIcon(file.mimeType)
  const isImageFile = isImage(file.mimeType)

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50',
          isSelected && 'border-primary bg-primary/10'
        )}
      >
        <div className="flex flex-1 items-center space-x-3" onClick={onPreview}>
          {isImageFile && file.thumbnailUrl ? (
            <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-muted">
              <NextImage
                src={file.thumbnailUrl}
                alt={file.altText || file.fileName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <Icon className="h-8 w-8 flex-shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {file.originalFileName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)} •{' '}
              {file.mimeType.split('/')[1]?.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(e.target.checked)}
            className="rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={onPreview}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    )
  }

  const galleryItem = (
    <div onClick={onPreview} className="cursor-pointer">
      <CardContent className="p-4">
        <div className="flex flex-col items-center space-y-2">
          {isImageFile && file.thumbnailUrl ? (
            <div className="relative h-20 w-full">
              <NextImage
                src={file.thumbnailUrl || file.url}
                alt={file.altText || file.fileName}
                fill
                className="rounded object-cover"
              />
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                  <span className="text-xs text-primary-foreground">✓</span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <Icon className="h-12 w-12 text-muted-foreground" />
              {isSelected && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                  <span className="text-xs text-primary-foreground">✓</span>
                </div>
              )}
            </div>
          )}
          <div className="w-full space-y-1 text-center">
            <p className="truncate text-sm font-medium">
              {file.originalFileName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </p>
          </div>
        </div>
      </CardContent>
    </div>
  )

  return (
    <Card
      className={cn(
        'group relative transition-all duration-200 hover:shadow-md',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      {galleryItem}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  )
}
