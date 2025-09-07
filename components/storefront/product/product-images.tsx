'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react'
import { ImageZoomModal } from './image-zoom-modal'

interface ProductImagesProps {
  images: Array<{ url: string; alt?: string }>
  title: string
}

export function ProductImages({ images, title }: ProductImagesProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false)

  const hasImages = images && images.length > 0
  const displayImages = hasImages ? images : [{ url: '/images/placeholder-product.png' }]

  const handlePrevious = () => {
    setSelectedImage((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setSelectedImage((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
  }

  const openZoomModal = () => {
    setIsZoomModalOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Thumbnails - Left side on desktop */}
        {displayImages.length > 1 && (
          <div className="order-2 lg:order-1 lg:col-span-1">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {displayImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all hover:shadow-md",
                    selectedImage === index
                      ? "border-black shadow-md ring-2 ring-black/10"
                      : "border-gray-200 hover:border-gray-400"
                  )}
                >
                  <Image
                    src={image.url}
                    alt={`${title} ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Image */}
        <div className={cn(
          "order-1 lg:order-2",
          displayImages.length > 1 ? "lg:col-span-4" : "lg:col-span-5"
        )}>
          <div className="relative aspect-square bg-gray-50 rounded-lg overflow-hidden group border border-gray-200 hover:shadow-lg transition-shadow">
            <Image
              src={displayImages[selectedImage].url}
              alt={displayImages[selectedImage].alt || title}
              fill
              className="object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
              onClick={openZoomModal}
              priority
            />
            
            {/* Zoom indicator */}
            <button
              onClick={openZoomModal}
              className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110"
              title="Click to zoom"
            >
              <Expand className="h-4 w-4" />
            </button>

            {/* Navigation arrows - Only show if multiple images */}
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110"
                  title="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-14 top-1/2 -translate-y-1/2 p-2 bg-white/90 backdrop-blur rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:scale-110"
                  title="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Image counter */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/70 text-white text-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {selectedImage + 1} / {displayImages.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Zoom Modal */}
      <ImageZoomModal
        isOpen={isZoomModalOpen}
        onClose={() => setIsZoomModalOpen(false)}
        images={displayImages}
        initialIndex={selectedImage}
        title={title}
      />
    </>
  )
}