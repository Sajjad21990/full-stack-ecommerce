import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Suspense } from 'react'
import { MediaUpload } from '@/components/admin/media/media-upload'
import { getMediaFolders } from '@/lib/admin/queries/media'

export default function MediaUploadPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/media">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Media</h1>
          <p className="text-muted-foreground">
            Upload images, videos, and documents to your media library
          </p>
        </div>
      </div>

      {/* Upload Component */}
      <Suspense fallback={<div>Loading upload interface...</div>}>
        <MediaUploadWrapper />
      </Suspense>
    </div>
  )
}

async function MediaUploadWrapper() {
  const folders = await getMediaFolders()
  
  return (
    <MediaUpload 
      folders={folders}
      maxFiles={20}
      acceptedTypes={[
        'image/jpeg',
        'image/png', 
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'video/mp4',
        'video/webm',
        'application/pdf'
      ]}
    />
  )
}