import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format price with currency
 */
export function formatPrice(
  amount: number | string,
  currency: string = 'INR'
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(
  price: number,
  compareAtPrice: number | null
): number | null {
  if (!compareAtPrice || compareAtPrice <= price) {
    return null
  }
  
  const discount = ((compareAtPrice - price) / compareAtPrice) * 100
  return Math.round(discount)
}

/**
 * Format product handle for URL
 */
export function formatHandle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Get product image URL with optimization
 */
export function getProductImageUrl(
  imageUrl: string | null | undefined,
  size: 'thumb' | 'small' | 'medium' | 'large' = 'medium'
): string {
  if (!imageUrl) {
    return '/images/placeholder-product.png'
  }
  
  // If using a CDN, add size parameters here
  const sizeParams = {
    thumb: 'w=100&h=100',
    small: 'w=300&h=300',
    medium: 'w=600&h=600',
    large: 'w=1200&h=1200'
  }
  
  // If image URL contains query params, append with &, otherwise use ?
  const separator = imageUrl.includes('?') ? '&' : '?'
  
  return `${imageUrl}${separator}${sizeParams[size]}&fm=webp&q=80`
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text
  }
  
  return text.substring(0, maxLength).trim() + '...'
}

/**
 * Generate breadcrumb items
 */
export interface BreadcrumbItem {
  label: string
  href?: string
}

export function generateBreadcrumbs(
  path: string,
  customLabels?: Record<string, string>
): BreadcrumbItem[] {
  const segments = path.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', href: '/' }
  ]
  
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1
    
    breadcrumbs.push({
      label: customLabels?.[segment] || formatLabel(segment),
      href: isLast ? undefined : currentPath
    })
  })
  
  return breadcrumbs
}

function formatLabel(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Debounce function for search
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Check if product is in stock
 */
export function isInStock(inventoryQuantity: number): boolean {
  return inventoryQuantity > 0
}

/**
 * Get stock status label
 */
export function getStockStatus(inventoryQuantity: number): string {
  if (inventoryQuantity === 0) {
    return 'Out of Stock'
  } else if (inventoryQuantity <= 5) {
    return `Only ${inventoryQuantity} left`
  } else {
    return 'In Stock'
  }
}

/**
 * Get stock status color
 */
export function getStockStatusColor(inventoryQuantity: number): string {
  if (inventoryQuantity === 0) {
    return 'text-red-600'
  } else if (inventoryQuantity <= 5) {
    return 'text-amber-600'
  } else {
    return 'text-green-600'
  }
}

/**
 * Parse search params
 */
export function parseSearchParams(searchParams: URLSearchParams) {
  const params: Record<string, any> = {}
  
  searchParams.forEach((value, key) => {
    // Handle array parameters (e.g., vendor[]=nike&vendor[]=adidas)
    if (key.endsWith('[]')) {
      const cleanKey = key.slice(0, -2)
      if (!params[cleanKey]) {
        params[cleanKey] = []
      }
      params[cleanKey].push(value)
    } else {
      params[key] = value
    }
  })
  
  return params
}

/**
 * Build search params string
 */
export function buildSearchParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => searchParams.append(`${key}[]`, v))
    } else if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  return searchParams.toString()
}