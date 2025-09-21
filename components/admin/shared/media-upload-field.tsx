'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageIcon, X, Upload } from 'lucide-react'
import { GoogleDriveMediaPicker } from '@/components/admin/media/google-drive-media-picker'
import { getMediaForPicker } from '@/lib/admin/actions/get-media-for-picker'
import { Badge } from '@/components/ui/badge'

interface MediaUploadFieldProps {
  value?: string
  onChange: (value: string | undefined) => void
  defaultFolder?: string
  label?: string
  description?: string
}

export function MediaUploadField({
  value,
  onChange,
  defaultFolder = 'general',
  label = 'Image',
  description = 'Upload or select an image',
}: MediaUploadFieldProps) {
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const [mediaData, setMediaData] = useState({ media: [], folders: [] })

  useEffect(() => {
    if (mediaLibraryOpen) {
      loadMediaData()
    }
  }, [mediaLibraryOpen])

  const loadMediaData = async () => {
    try {
      const data = await getMediaForPicker()
      setMediaData(data)
    } catch (error) {
      console.error('Failed to load media data:', error)
    }
  }

  const handleMediaSelect = (urls: string[]) => {
    if (urls.length > 0) {
      onChange(urls[0])
    }
    setMediaLibraryOpen(false)
  }

  const handleRemove = () => {
    onChange(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">{label}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-8"
          >
            <X className="mr-1 h-3 w-3" />
            Remove
          </Button>
        )}
      </div>

      {value ? (
        <div className="group relative">
          <img
            src={value}
            alt="Selected image"
            className="h-48 w-full rounded-lg border object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMediaLibraryOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Change
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRemove}
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50"
          onClick={() => setMediaLibraryOpen(true)}
        >
          <ImageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-1 text-sm font-medium">Click to upload or select</p>
          <p className="text-xs text-muted-foreground">
            Choose from media library or upload new
          </p>
        </div>
      )}

      <GoogleDriveMediaPicker
        open={mediaLibraryOpen}
        onOpenChange={setMediaLibraryOpen}
        onSelect={handleMediaSelect}
        initialMedia={mediaData.media}
        initialFolders={mediaData.folders}
        multiple={false}
        maxSelections={1}
        title={`Select ${label}`}
        description={`Choose from media library or upload new`}
      />
    </div>
  )
}
