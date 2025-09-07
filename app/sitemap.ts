import { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { products } from '@/db/schema/products'
import { collections } from '@/db/schema/collections'
import { eq } from 'drizzle-orm'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourstore.com'

  // Static pages with high priority
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/account`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/account/orders`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/account/wishlist`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/cart`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/checkout`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
  ]

  try {
    // Get all active collections
    const activeCollections = await db.query.collections.findMany({
      where: eq(collections.status, 'active'),
      columns: {
        handle: true,
        updatedAt: true,
      },
      orderBy: collections.updatedAt,
    })

    const collectionPages = activeCollections.map((collection) => ({
      url: `${baseUrl}/collections/${collection.handle}`,
      lastModified: collection.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    // Get all active products
    const activeProducts = await db.query.products.findMany({
      where: eq(products.status, 'active'),
      columns: {
        handle: true,
        updatedAt: true,
      },
      orderBy: products.updatedAt,
    })

    const productPages = activeProducts.map((product) => ({
      url: `${baseUrl}/products/${product.handle}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))

    // Combine all URLs
    return [...staticPages, ...collectionPages, ...productPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    
    // Return static pages only if database query fails
    return staticPages
  }
}