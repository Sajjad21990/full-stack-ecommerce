import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Upload, Folder, Image, FileText } from 'lucide-react'
import { getMediaAssets, getMediaFolders, getMediaTags } from '@/lib/admin/queries/media'
import { MediaLibrary } from '@/components/admin/media/media-library'
import { MediaUpload } from '@/components/admin/media/media-upload'
import { MediaFilters } from '@/components/admin/media/media-filters'
import { NewFolderDialog } from '@/components/admin/media/new-folder-dialog'
import { formatFileSize } from '@/lib/utils'
import Link from 'next/link'

interface MediaPageProps {
  searchParams: {
    search?: string
    folder?: string
    mimeType?: string
    tags?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    page?: string
    limit?: string
  }
}

export default function MediaPage({ searchParams }: MediaPageProps) {
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
          <NewFolderDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <Suspense fallback={<MediaStatsSkeleton />}>
        <MediaStats />
      </Suspense>

      {/* Filters */}
      <Suspense fallback={<div className="h-20" />}>
        <MediaFiltersWrapper />
      </Suspense>

      {/* Media Library */}
      <Suspense fallback={<MediaLibrarySkeleton />}>
        <MediaLibraryWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

async function MediaStats() {
  const { stats } = await getMediaAssets({ limit: 1 })

  const getMimeTypeIcon = (type: string) => {
    if (type.startsWith('image/')) return Image
    if (type.startsWith('video/')) return FileText
    return FileText
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Files</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalFiles.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(stats.totalSize)} total
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Images</CardTitle>
          <Image className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Object.entries(stats.byMimeType)
              .filter(([type]) => type.startsWith('image/'))
              .reduce((sum, [, count]) => sum + count, 0)
              .toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, WebP, etc.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Folders</CardTitle>
          <Folder className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{Object.keys(stats.byFolder).length}</div>
          <p className="text-xs text-muted-foreground">
            Organized collections
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
          <p className="text-xs text-muted-foreground">
            Across all files
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

async function MediaFiltersWrapper() {
  const [folders, tags] = await Promise.all([
    getMediaFolders(),
    getMediaTags()
  ])
  
  return <MediaFilters folders={folders.filter(f => f !== null) as string[]} tags={tags} />
}

async function MediaLibraryWrapper({ searchParams }: { searchParams: MediaPageProps['searchParams'] }) {
  const filters = {
    search: searchParams.search,
    folder: searchParams.folder,
    mimeType: searchParams.mimeType,
    tags: searchParams.tags?.split(',').filter(Boolean),
    sortBy: searchParams.sortBy as any || 'createdAt',
    sortOrder: searchParams.sortOrder || 'desc',
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '24')
  }

  const { media, pagination, stats } = await getMediaAssets(filters)

  return (
    <MediaLibrary 
      media={media}
      pagination={pagination}
      currentFilters={filters}
      stats={stats}
    />
  )
}

function MediaStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function MediaLibrarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-0">
              <Skeleton className="w-full h-32" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}