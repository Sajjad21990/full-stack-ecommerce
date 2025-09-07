'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProductMediaUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
}

export function ProductMediaUpload({ 
  images, 
  onImagesChange, 
  maxImages = 10 
}: ProductMediaUploadProps) {
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // For now, we'll create mock URLs - in a real app, you'd upload to your storage service
    const newImages = acceptedFiles.slice(0, maxImages - images.length).map((file) => {
      return URL.createObjectURL(file)
    })
    
    onImagesChange([...images, ...newImages])
  }, [images, onImagesChange, maxImages])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: maxImages - images.length,
    disabled: images.length >= maxImages
  })

  const removeImage = (index: number) => {
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
          Add images to showcase your product. First image will be the main product image.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Images */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden border-2 border-border">
                  <img
                    src={image}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Main image badge */}
                {index === 0 && (
                  <Badge className="absolute top-2 left-2 text-xs">
                    Main
                  </Badge>
                )}
                {/* Remove button */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragActive || dragActive
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {isDragActive ? (
                <Upload className="h-8 w-8 text-primary" />
              ) : (
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {isDragActive
                    ? 'Drop images here'
                    : 'Drag & drop images, or click to select'
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {images.length === 0 
                    ? `Upload up to ${maxImages} images (JPG, PNG, GIF, WebP)`
                    : `Add ${maxImages - images.length} more image${maxImages - images.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
              <Button variant="outline" size="sm" className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Choose Images
              </Button>
            </div>
          </div>
        )}

        {/* Info */}
        {images.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• First image will be used as the main product image</p>
            <p>• Recommended size: 1200×1200px or larger</p>
            <p>• Supported formats: JPG, PNG, GIF, WebP</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}