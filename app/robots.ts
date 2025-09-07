import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://yourstore.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/products/',
          '/collections/',
          '/search',
          '/api/og',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/account/',
          '/checkout/',
          '/cart',
          '/_next/',
          '/private/',
          '/*.json$',
          '/*?*', // Query parameters
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/products/',
          '/collections/',
          '/search',
          '/api/og',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/account/',
          '/checkout/',
          '/cart',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/products/',
          '/collections/',
          '/search',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/account/',
          '/checkout/',
          '/cart',
          '/_next/',
          '/private/',
        ],
        crawlDelay: 2,
      },
      // Block aggressive crawlers
      {
        userAgent: [
          'AhrefsBot',
          'MJ12bot',
          'SemrushBot',
          'DotBot'
        ],
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}