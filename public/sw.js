const CACHE_NAME = 'ecommerce-v1'
const STATIC_CACHE_NAME = 'ecommerce-static-v1'
const DYNAMIC_CACHE_NAME = 'ecommerce-dynamic-v1'

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline',
  // Add other critical static assets here
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/products',
  '/api/collections',
  '/api/search'
]

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('SW: Installing service worker')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('SW: Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('SW: Skip waiting')
        return self.skipWaiting()
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activating service worker')
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('SW: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('SW: Claiming clients')
        return self.clients.claim()
      })
  )
})

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - network first, then cache
    event.respondWith(networkFirstStrategy(request))
  } else if (request.destination === 'image') {
    // Images - cache first
    event.respondWith(cacheFirstStrategy(request))
  } else if (url.pathname === '/' || url.pathname.startsWith('/products') || 
             url.pathname.startsWith('/collections')) {
    // Important pages - stale while revalidate
    event.respondWith(staleWhileRevalidateStrategy(request))
  } else {
    // Other requests - network first
    event.respondWith(networkFirstStrategy(request))
  }
})

// Network first strategy - try network, fallback to cache
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('SW: Network failed, trying cache:', request.url)
    
    const cachedResponse = await caches.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline')
    }
    
    throw error
  }
}

// Cache first strategy - try cache, fallback to network
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('SW: Failed to fetch:', request.url)
    throw error
  }
}

// Stale while revalidate - serve from cache, update in background
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME)
  const cachedResponse = await cache.match(request)
  
  // Fetch in background to update cache
  const networkResponsePromise = fetch(request)
    .then(networkResponse => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    })
    .catch(error => {
      console.log('SW: Background fetch failed:', request.url)
      return null
    })
  
  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Wait for network response if no cache
  try {
    const networkResponse = await networkResponsePromise
    return networkResponse || caches.match('/offline')
  } catch (error) {
    return caches.match('/offline')
  }
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('SW: Background sync:', event.tag)
  
  if (event.tag === 'cart-sync') {
    event.waitUntil(syncCartData())
  }
  
  if (event.tag === 'wishlist-sync') {
    event.waitUntil(syncWishlistData())
  }
})

// Sync cart data when back online
async function syncCartData() {
  try {
    // Get offline cart actions from IndexedDB
    const offlineActions = await getOfflineCartActions()
    
    for (const action of offlineActions) {
      try {
        await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(action),
        })
        
        // Remove from offline storage after successful sync
        await removeOfflineCartAction(action.id)
      } catch (error) {
        console.log('SW: Failed to sync cart action:', error)
      }
    }
  } catch (error) {
    console.log('SW: Cart sync failed:', error)
  }
}

// Sync wishlist data when back online
async function syncWishlistData() {
  try {
    const offlineActions = await getOfflineWishlistActions()
    
    for (const action of offlineActions) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(action),
        })
        
        await removeOfflineWishlistAction(action.id)
      } catch (error) {
        console.log('SW: Failed to sync wishlist action:', error)
      }
    }
  } catch (error) {
    console.log('SW: Wishlist sync failed:', error)
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('SW: Push notification received')
  
  if (!event.data) {
    return
  }
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey || 1,
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close.png'
      }
    ]
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', event => {
  console.log('SW: Notification clicked')
  
  event.notification.close()
  
  if (event.action === 'close') {
    return
  }
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Check if app is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i]
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})

// Helper functions for offline data management
async function getOfflineCartActions() {
  // Implementation depends on your offline storage strategy
  // This is a placeholder
  return []
}

async function removeOfflineCartAction(id) {
  // Implementation depends on your offline storage strategy
  // This is a placeholder
}

async function getOfflineWishlistActions() {
  // Implementation depends on your offline storage strategy
  // This is a placeholder
  return []
}

async function removeOfflineWishlistAction(id) {
  // Implementation depends on your offline storage strategy
  // This is a placeholder
}

// Periodic background sync for cache cleanup
self.addEventListener('periodicsync', event => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupOldCaches())
  }
})

async function cleanupOldCaches() {
  const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, CACHE_NAME]
  const cacheNames = await caches.keys()
  
  return Promise.all(
    cacheNames.map(cacheName => {
      if (!cacheWhitelist.includes(cacheName)) {
        console.log('SW: Deleting old cache:', cacheName)
        return caches.delete(cacheName)
      }
    })
  )
}