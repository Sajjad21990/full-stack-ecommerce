'use client'

// Google Analytics 4 Integration
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID

// Track page views
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_location: url,
      page_title: document.title,
    })
  }
}

// Track custom events
export const event = ({
  action,
  category,
  label,
  value,
  ...parameters
}: {
  action: string
  category: string
  label?: string
  value?: number
  [key: string]: any
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      ...parameters,
    })
  }
}

// E-commerce tracking events
export const ecommerce = {
  // View item
  viewItem: (item: {
    currency: string
    value: number
    item_id: string
    item_name: string
    item_category: string
    item_brand?: string
    price: number
    quantity: number
  }) => {
    event({
      action: 'view_item',
      category: 'ecommerce',
      currency: item.currency,
      value: item.value,
      items: [item]
    })
  },

  // Add to cart
  addToCart: (item: {
    currency: string
    value: number
    item_id: string
    item_name: string
    item_category: string
    item_brand?: string
    price: number
    quantity: number
  }) => {
    event({
      action: 'add_to_cart',
      category: 'ecommerce',
      currency: item.currency,
      value: item.value,
      items: [item]
    })
  },

  // Remove from cart
  removeFromCart: (item: {
    currency: string
    value: number
    item_id: string
    item_name: string
    item_category: string
    price: number
    quantity: number
  }) => {
    event({
      action: 'remove_from_cart',
      category: 'ecommerce',
      currency: item.currency,
      value: item.value,
      items: [item]
    })
  },

  // Add to wishlist
  addToWishlist: (item: {
    currency: string
    value: number
    item_id: string
    item_name: string
    item_category: string
    price: number
  }) => {
    event({
      action: 'add_to_wishlist',
      category: 'ecommerce',
      currency: item.currency,
      value: item.value,
      items: [item]
    })
  },

  // Begin checkout
  beginCheckout: (items: any[], value: number, currency: string = 'INR') => {
    event({
      action: 'begin_checkout',
      category: 'ecommerce',
      currency,
      value,
      items
    })
  },

  // Purchase
  purchase: ({
    transaction_id,
    value,
    currency = 'INR',
    items,
    shipping = 0,
    tax = 0
  }: {
    transaction_id: string
    value: number
    currency?: string
    items: any[]
    shipping?: number
    tax?: number
  }) => {
    event({
      action: 'purchase',
      category: 'ecommerce',
      transaction_id,
      value,
      currency,
      items,
      shipping,
      tax
    })
  },

  // Search
  search: (search_term: string) => {
    event({
      action: 'search',
      category: 'engagement',
      search_term
    })
  },

  // View search results
  viewSearchResults: (search_term: string, results_count: number) => {
    event({
      action: 'view_search_results',
      category: 'engagement',
      search_term,
      results_count
    })
  }
}

// User engagement tracking
export const engagement = {
  // Newsletter signup
  newsletterSignup: (method: string = 'website') => {
    event({
      action: 'sign_up',
      category: 'engagement',
      method
    })
  },

  // Login
  login: (method: string = 'email') => {
    event({
      action: 'login',
      category: 'user',
      method
    })
  },

  // Share
  share: (content_type: string, item_id: string, method: string) => {
    event({
      action: 'share',
      category: 'engagement',
      content_type,
      item_id,
      method
    })
  },

  // Contact form submission
  contactForm: (form_type: string) => {
    event({
      action: 'form_submit',
      category: 'engagement',
      form_type
    })
  },

  // Download (like catalog, brochure)
  download: (file_name: string, file_type: string) => {
    event({
      action: 'file_download',
      category: 'engagement',
      file_name,
      file_type
    })
  }
}

// Performance tracking
export const performance = {
  // Track Core Web Vitals
  trackWebVitals: (metric: {
    id: string
    name: string
    value: number
    delta: number
    rating: 'good' | 'needs-improvement' | 'poor'
  }) => {
    event({
      action: metric.name,
      category: 'performance',
      label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      metric_rating: metric.rating,
      metric_delta: metric.delta,
      metric_value: metric.value
    })
  },

  // Track page load time
  pageLoadTime: (loadTime: number, page: string) => {
    event({
      action: 'page_load_time',
      category: 'performance',
      label: page,
      value: Math.round(loadTime)
    })
  }
}

// Error tracking
export const errorTracking = {
  // JavaScript errors
  jsError: (error: Error, errorInfo?: any) => {
    event({
      action: 'js_error',
      category: 'error',
      label: error.message,
      error_stack: error.stack,
      error_info: JSON.stringify(errorInfo)
    })
  },

  // API errors
  apiError: (endpoint: string, status: number, message: string) => {
    event({
      action: 'api_error',
      category: 'error',
      label: endpoint,
      error_status: status,
      error_message: message
    })
  },

  // 404 errors
  notFound: (path: string, referrer?: string) => {
    event({
      action: '404_error',
      category: 'error',
      label: path,
      referrer
    })
  }
}

// Utility functions
export const utils = {
  // Get user ID (for user-scoped custom dimensions)
  getUserId: () => {
    if (typeof window !== 'undefined' && window.gtag) {
      return window.gtag('get', GA_TRACKING_ID, 'client_id')
    }
    return null
  },

  // Set user properties
  setUserProperties: (properties: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', GA_TRACKING_ID, {
        user_properties: properties
      })
    }
  },

  // Enable/disable analytics
  setAnalyticsEnabled: (enabled: boolean) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: enabled ? 'granted' : 'denied'
      })
    }
  }
}

// Facebook Pixel Integration
export const fbq = {
  init: () => {
    if (typeof window !== 'undefined' && window.fbq && process.env.NEXT_PUBLIC_FB_PIXEL_ID) {
      window.fbq('init', process.env.NEXT_PUBLIC_FB_PIXEL_ID)
      window.fbq('track', 'PageView')
    }
  },

  track: (eventName: string, parameters?: any) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', eventName, parameters)
    }
  },

  trackCustom: (eventName: string, parameters?: any) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('trackCustom', eventName, parameters)
    }
  }
}

// Initialize analytics
export const initAnalytics = () => {
  // Set default consent
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'granted',
      functionality_storage: 'granted',
      personalization_storage: 'granted'
    })
  }

  // Initialize Facebook Pixel
  fbq.init()
}

// Type declarations for global objects
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    fbq: (...args: any[]) => void
  }
}