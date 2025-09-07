'use client'

import { useEffect } from 'react'
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'
import { performance } from '@/lib/analytics'

export function WebVitals() {
  useEffect(() => {
    // Cumulative Layout Shift
    getCLS((metric) => {
      performance.trackWebVitals({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating
      })
    })

    // First Input Delay
    getFID((metric) => {
      performance.trackWebVitals({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating
      })
    })

    // First Contentful Paint
    getFCP((metric) => {
      performance.trackWebVitals({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating
      })
    })

    // Largest Contentful Paint
    getLCP((metric) => {
      performance.trackWebVitals({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating
      })
    })

    // Time to First Byte
    getTTFB((metric) => {
      performance.trackWebVitals({
        id: metric.id,
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        rating: metric.rating
      })
    })
  }, [])

  return null
}

// Performance monitoring hook
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Monitor navigation timing
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.navigationStart
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart
        const firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0
        
        // Track page load metrics
        performance.pageLoadTime(loadTime, window.location.pathname)
        
        // Log performance metrics for debugging
        console.log('Performance Metrics:', {
          loadTime: Math.round(loadTime),
          domContentLoaded: Math.round(domContentLoaded),
          firstPaint: Math.round(firstPaint),
          pathname: window.location.pathname
        })
      }
    }

    // Monitor resource loading
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // Track slow resources
        if (entry.duration > 1000) {
          console.warn('Slow resource detected:', {
            name: entry.name,
            duration: Math.round(entry.duration),
            type: entry.initiatorType
          })
        }
      })
    })

    if ('observe' in observer) {
      observer.observe({ entryTypes: ['resource'] })
    }

    return () => {
      observer.disconnect()
    }
  }, [])
}