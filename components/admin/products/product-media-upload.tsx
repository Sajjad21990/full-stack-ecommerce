'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon, Plus, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  uploadProductImage,
  deleteProductImage,
} from '@/lib/admin/actions/upload-image'
import { toast } from 'sonner'

interface ProductMediaUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
}

export function ProductMediaUpload({
  images,
  onImagesChange,
  maxImages = 10,
}: ProductMediaUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>(
    {}
  )

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const filesToUpload = acceptedFiles.slice(0, maxImages - images.length)

      if (filesToUpload.length === 0) return

      setIsUploading(true)
      const uploadedUrls: string[] = []

      for (const file of filesToUpload) {
        const formData = new FormData()
        formData.append('file', file)

        try {
          // Show progress for this file
          setUploadProgress((prev) => ({ ...prev, [file.name]: 50 }))

          const result = await uploadProductImage(formData)

          if (result.success && result.url) {
            uploadedUrls.push(result.url)
            setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }))
          } else {
            toast.error(result.error || `Failed to upload ${file.name}`)
          }
        } catch (error) {
          toast.error(`Failed to upload ${file.name}`)
        }
      }

      if (uploadedUrls.length > 0) {
        onImagesChange([...images, ...uploadedUrls])
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`)
      }

      setIsUploading(false)
      setUploadProgress({})
    },
    [images, onImagesChange, maxImages]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxFiles: maxImages - images.length,
    disabled: images.length >= maxImages || isUploading,
  })

  const removeImage = async (index: number) => {
    const imageToRemove = images[index]

    // Delete from storage if it's a Firebase URL
    if (imageToRemove.includes('storage.googleapis.com')) {
      const result = await deleteProductImage(imageToRemove)
      if (!result.success) {
        console.error('Failed to delete image from storage:', result.error)
      }
    }

    const newImages = [...images]
    newImages.splice(index, 1)
    onImagesChange(newImages)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Product Images
        </CardTitle>
        <CardDescription>
          Add images to showcase your product. First image will be the main
          product image.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Images */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <div key={index} className="group relative">
                <div className="aspect-square overflow-hidden rounded-lg border-2 border-border bg-muted">
                  <img
                    src={image}
                    alt={`Product image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                {/* Main image badge */}
                {index === 0 && (
                  <Badge className="absolute left-2 top-2 text-xs">Main</Badge>
                )}
                {/* Remove button */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute right-2 top-2 h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Upload Area */}
        {images.length < maxImages && (
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive || dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            } `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : isDragActive ? (
                <Upload className="h-8 w-8 text-primary" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isUploading
                    ? 'Uploading images...'
                    : isDragActive
                      ? 'Drop images here'
                      : 'Drag & drop images, or click to select'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isUploading
                    ? 'Please wait while we upload your images'
                    : images.length === 0
                      ? `Upload up to ${maxImages} images (JPG, PNG, GIF, WebP)`
                      : `Add ${maxImages - images.length} more image${maxImages - images.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Choose Images
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Info */}
        {images.length > 0 && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>• First image will be used as the main product image</p>
            <p>• Recommended size: 1200×1200px or larger</p>
            <p>• Supported formats: JPG, PNG, GIF, WebP</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
