'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { X, Gift, Zap, Percent } from 'lucide-react'

interface Promotion {
  id: string
  title: string
  heading?: string | null
  subheading?: string | null
  bodyText?: string | null
  buttonText?: string | null
  buttonUrl?: string | null
  imageUrl?: string | null
  imageAlt?: string | null
  template: string
  backgroundColor?: string | null
  textColor?: string | null
  buttonColor?: string | null
  placement: string
  position?: string | null
  dismissible: boolean
  showOnce: boolean
  delaySeconds: number
  autoHideSeconds?: number | null
}

interface PromotionalBannerProps {
  promotion: Promotion
  onInteraction?: (type: 'view' | 'click' | 'dismiss' | 'close') => void
}

const getPromotionIcon = (template: string) => {
  switch (template) {
    case 'discount':
      return <Percent className="w-5 h-5" />
    case 'flash_sale':
      return <Zap className="w-5 h-5" />
    case 'gift':
      return <Gift className="w-5 h-5" />
    default:
      return null
  }
}

const HeroBanner = ({ promotion, onInteraction }: PromotionalBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false)

  const handleDismiss = () => {
    setIsDismissed(true)
    onInteraction?.('dismiss')
    
    if (promotion.showOnce) {
      localStorage.setItem(`promotion_dismissed_${promotion.id}`, 'true')
    }
  }

  const handleClick = () => {
    onInteraction?.('click')
  }

  if (isDismissed) return null

  return (
    <div 
      className="relative overflow-hidden rounded-lg"
      style={{ 
        backgroundColor: promotion.backgroundColor || '#f3f4f6',
        color: promotion.textColor || '#111827'
      }}
    >
      {/* Background Image */}
      {promotion.imageUrl && (
        <div className="absolute inset-0">
          <Image
            src={promotion.imageUrl}
            alt={promotion.imageAlt || promotion.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      {/* Content */}
      <div className="relative px-8 py-12 text-center">
        {promotion.dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-current hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        <div className="max-w-3xl mx-auto">
          {promotion.heading && (
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {promotion.heading}
            </h2>
          )}

          {promotion.subheading && (
            <p className="text-lg md:text-xl mb-6 opacity-90">
              {promotion.subheading}
            </p>
          )}

          {promotion.bodyText && (
            <p className="text-base mb-8 opacity-80">
              {promotion.bodyText}
            </p>
          )}

          {promotion.buttonText && promotion.buttonUrl && (
            <Button
              asChild
              size="lg"
              onClick={handleClick}
              style={{ backgroundColor: promotion.buttonColor || '#3b82f6' }}
              className="text-white hover:opacity-90"
            >
              <Link href={promotion.buttonUrl}>
                {promotion.buttonText}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

const TopBanner = ({ promotion, onInteraction }: PromotionalBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (promotion.showOnce) {
      const dismissed = localStorage.getItem(`promotion_dismissed_${promotion.id}`)
      if (dismissed) {
        setIsDismissed(true)
        return
      }
    }
    
    onInteraction?.('view')
  }, [promotion.id, promotion.showOnce, onInteraction])

  const handleDismiss = () => {
    setIsDismissed(true)
    onInteraction?.('dismiss')
    
    if (promotion.showOnce) {
      localStorage.setItem(`promotion_dismissed_${promotion.id}`, 'true')
    }
  }

  const handleClick = () => {
    onInteraction?.('click')
  }

  if (isDismissed) return null

  return (
    <div 
      className="relative px-4 py-3 text-center text-sm"
      style={{ 
        backgroundColor: promotion.backgroundColor || '#3b82f6',
        color: promotion.textColor || '#ffffff'
      }}
    >
      <div className="flex items-center justify-center gap-2">
        {getPromotionIcon(promotion.template)}
        
        <span>
          {promotion.heading && <strong>{promotion.heading} </strong>}
          {promotion.subheading}
        </span>

        {promotion.buttonText && promotion.buttonUrl && (
          <Link 
            href={promotion.buttonUrl}
            onClick={handleClick}
            className="underline font-medium hover:no-underline ml-2"
          >
            {promotion.buttonText}
          </Link>
        )}
      </div>

      {promotion.dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-current hover:bg-white/20 p-1 h-auto"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}

const SidebarBanner = ({ promotion, onInteraction }: PromotionalBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false)

  const handleDismiss = () => {
    setIsDismissed(true)
    onInteraction?.('dismiss')
    
    if (promotion.showOnce) {
      localStorage.setItem(`promotion_dismissed_${promotion.id}`, 'true')
    }
  }

  const handleClick = () => {
    onInteraction?.('click')
  }

  if (isDismissed) return null

  return (
    <div 
      className="relative rounded-lg p-6 text-center"
      style={{ 
        backgroundColor: promotion.backgroundColor || '#f9fafb',
        color: promotion.textColor || '#111827'
      }}
    >
      {promotion.dismissible && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-current hover:bg-white/20 p-1 h-auto"
        >
          <X className="w-3 h-3" />
        </Button>
      )}

      {promotion.imageUrl && (
        <div className="relative w-full h-32 mb-4 rounded overflow-hidden">
          <Image
            src={promotion.imageUrl}
            alt={promotion.imageAlt || promotion.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {promotion.heading && (
        <h3 className="font-bold text-lg mb-2">{promotion.heading}</h3>
      )}

      {promotion.subheading && (
        <p className="text-sm mb-3 opacity-80">{promotion.subheading}</p>
      )}

      {promotion.bodyText && (
        <p className="text-xs mb-4 opacity-70">{promotion.bodyText}</p>
      )}

      {promotion.buttonText && promotion.buttonUrl && (
        <Button
          asChild
          size="sm"
          onClick={handleClick}
          style={{ backgroundColor: promotion.buttonColor || '#3b82f6' }}
          className="w-full text-white hover:opacity-90"
        >
          <Link href={promotion.buttonUrl}>
            {promotion.buttonText}
          </Link>
        </Button>
      )}
    </div>
  )
}

const FloatingBanner = ({ promotion, onInteraction }: PromotionalBannerProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    if (promotion.showOnce) {
      const dismissed = localStorage.getItem(`promotion_dismissed_${promotion.id}`)
      if (dismissed) {
        setIsDismissed(true)
        return
      }
    }

    const timer = setTimeout(() => {
      setIsVisible(true)
      onInteraction?.('view')
    }, promotion.delaySeconds * 1000)

    return () => clearTimeout(timer)
  }, [promotion.delaySeconds, promotion.id, promotion.showOnce, onInteraction])

  useEffect(() => {
    if (isVisible && promotion.autoHideSeconds) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, promotion.autoHideSeconds * 1000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, promotion.autoHideSeconds])

  const handleDismiss = () => {
    setIsVisible(false)
    setIsDismissed(true)
    onInteraction?.('dismiss')
    
    if (promotion.showOnce) {
      localStorage.setItem(`promotion_dismissed_${promotion.id}`, 'true')
    }
  }

  const handleClick = () => {
    onInteraction?.('click')
  }

  if (!isVisible || isDismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <div 
        className="relative rounded-lg shadow-lg p-4"
        style={{ 
          backgroundColor: promotion.backgroundColor || '#ffffff',
          color: promotion.textColor || '#111827'
        }}
      >
        {promotion.dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-current hover:bg-gray-100 p-1 h-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        <div className="pr-6">
          {promotion.heading && (
            <h4 className="font-bold text-sm mb-2">{promotion.heading}</h4>
          )}

          {promotion.subheading && (
            <p className="text-xs mb-3 opacity-80">{promotion.subheading}</p>
          )}

          {promotion.buttonText && promotion.buttonUrl && (
            <Button
              asChild
              size="sm"
              onClick={handleClick}
              style={{ backgroundColor: promotion.buttonColor || '#3b82f6' }}
              className="text-white hover:opacity-90 text-xs"
            >
              <Link href={promotion.buttonUrl}>
                {promotion.buttonText}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export function PromotionalBanner({ promotion, onInteraction }: PromotionalBannerProps) {
  switch (promotion.template) {
    case 'hero':
      return <HeroBanner promotion={promotion} onInteraction={onInteraction} />
    case 'top':
      return <TopBanner promotion={promotion} onInteraction={onInteraction} />
    case 'sidebar':
      return <SidebarBanner promotion={promotion} onInteraction={onInteraction} />
    case 'floating':
      return <FloatingBanner promotion={promotion} onInteraction={onInteraction} />
    default:
      return <TopBanner promotion={promotion} onInteraction={onInteraction} />
  }
}