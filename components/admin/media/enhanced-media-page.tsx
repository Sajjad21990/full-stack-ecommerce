'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
// Removed resizable import - using simple grid layout
import { FolderTree } from './folder-tree'
import { MediaLibrary } from './media-library'
import { MediaFilters } from './media-filters'
import { NewFolderDialog } from './new-folder-dialog'
import { Upload, FolderPlus } from 'lucide-react'
import Link from 'next/link'

interface FolderNode {
  id: string
  name: string
  path: string
  parentId: string | null
  depth: string
  children: FolderNode[]
  totalFiles: number
  totalFolders: number
  createdAt: Date
}

interface EnhancedMediaPageProps {
  folders: FolderNode[]
  media: any[]
  pagination: any
  stats: any
  availableFolders: string[]
  availableTags: string[]
}

export function EnhancedMediaPage({
  folders,
  media,
  pagination,
  stats,
  availableFolders,
  availableTags,
}: EnhancedMediaPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>()

  const currentFilters = {
    search: searchParams.get('search'),
    folder: searchParams.get('folder'),
    mimeType: searchParams.get('mimeType'),
    tags: searchParams.get('tags')?.split(',').filter(Boolean),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: searchParams.get('sortOrder') || 'desc',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '24'),
  }

  const handleFolderSelect = (folderPath: string) => {
    const params = new URLSearchParams(searchParams)

    if (folderPath) {
      params.set('folder', folderPath)
    } else {
      params.delete('folder')
    }

    params.delete('page') // Reset to first page
    router.push(`/admin/media?${params.toString()}`)
  }

  const handleCreateFolder = (parentId?: string) => {
    setSelectedParentId(parentId)
    setShowNewFolderDialog(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground">
            Upload, organize, and manage your media files
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/media/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Files
            </Link>
          </Button>
          <Button onClick={() => handleCreateFolder()}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalFiles.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Folders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.entries(stats.byMimeType)
                .filter(([type]) => type.startsWith('image/'))
                .reduce((sum, [, count]) => sum + count, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid min-h-[600px] grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Folder Tree Sidebar */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Folders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto p-4">
                <FolderTree
                  folders={folders}
                  currentFolder={currentFilters.folder || ''}
                  onFolderSelect={handleFolderSelect}
                  onCreateFolder={handleCreateFolder}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Media Content */}
        <div className="lg:col-span-3">
          <div className="space-y-4">
            {/* Filters */}
            <MediaFilters folders={availableFolders} tags={availableTags} />

            <Separator />

            {/* Media Grid */}
            <MediaLibrary
              media={media}
              pagination={pagination}
              currentFilters={currentFilters}
              stats={stats}
            />
          </div>
        </div>
      </div>

      {/* New Folder Dialog */}
      <NewFolderDialog parentId={selectedParentId} />
    </div>
  )
}
