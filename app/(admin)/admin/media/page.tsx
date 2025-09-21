import { Suspense } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Upload, Folder, Image, FileText } from 'lucide-react'
import {
  getMediaAssets,
  getMediaFolders,
  getMediaTags,
  getMediaFoldersWithCounts,
} from '@/lib/admin/queries/media'
import { MediaLibrary } from '@/components/admin/media/media-library'
import { MediaUpload } from '@/components/admin/media/media-upload'
import { MediaFilters } from '@/components/admin/media/media-filters'
import { NewFolderDialog } from '@/components/admin/media/new-folder-dialog'
import { GoogleDriveMedia } from '@/components/admin/media/google-drive-media'
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
    view?: 'classic' | 'drive'
  }
}

export default function MediaPage({ searchParams }: MediaPageProps) {
  // Use Google Drive view by default
  const useGoogleDriveView = searchParams.view !== 'classic'

  if (useGoogleDriveView) {
    return (
      <div className="space-y-6">
        <Suspense fallback={<GoogleDriveMediaSkeleton />}>
          <GoogleDriveMediaWrapper searchParams={searchParams} />
        </Suspense>
      </div>
    )
  }

  // Classic view (original implementation)
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
          <div className="text-2xl font-bold">
            {stats.totalFiles.toLocaleString()}
          </div>
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
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, etc.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Folders</CardTitle>
          <Folder className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {Object.keys(stats.byFolder).length}
          </div>
          <p className="text-xs text-muted-foreground">Organized collections</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatFileSize(stats.totalSize)}
          </div>
          <p className="text-xs text-muted-foreground">Across all files</p>
        </CardContent>
      </Card>
    </div>
  )
}

async function MediaFiltersWrapper() {
  const [folders, tags] = await Promise.all([getMediaFolders(), getMediaTags()])

  return (
    <MediaFilters
      folders={folders.filter((f) => f !== null) as string[]}
      tags={tags}
    />
  )
}

async function MediaLibraryWrapper({
  searchParams,
}: {
  searchParams: MediaPageProps['searchParams']
}) {
  const filters = {
    search: searchParams.search,
    folder: searchParams.folder,
    mimeType: searchParams.mimeType,
    tags: searchParams.tags?.split(',').filter(Boolean),
    sortBy: (searchParams.sortBy as any) || 'createdAt',
    sortOrder: searchParams.sortOrder || 'desc',
    page: parseInt(searchParams.page || '1'),
    limit: parseInt(searchParams.limit || '24'),
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

async function GoogleDriveMediaWrapper({
  searchParams,
}: {
  searchParams: MediaPageProps['searchParams']
}) {
  const [media, folders] = await Promise.all([
    getMediaAssets({ limit: 1000 }), // Get all media for Google Drive view
    getMediaFoldersWithCounts(),
  ])

  return (
    <GoogleDriveMedia
      initialMedia={media.media}
      initialFolders={folders}
      currentFolder={searchParams.folder || ''}
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
            <Skeleton className="mb-1 h-8 w-16" />
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
              <Skeleton className="h-32 w-full" />
              <div className="space-y-2 p-3">
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

function GoogleDriveMediaSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32" />
          <span>/</span>
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex flex-col items-center space-y-2">
                <Skeleton className="h-20 w-full rounded" />
                <div className="w-full space-y-1 text-center">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="mx-auto h-3 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
