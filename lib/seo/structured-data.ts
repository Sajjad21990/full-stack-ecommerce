import { Product } from '@/db/schema/products'

// Organization structured data
export const organizationStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Your Store Name',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://yourstore.com',
  logo: `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`,
  description: 'Your store description here',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-1234567890',
    contactType: 'Customer Service',
    availableLanguage: ['English', 'Hindi']
  },
  sameAs: [
    'https://www.facebook.com/yourstore',
    'https://www.instagram.com/yourstore',
    'https://twitter.com/yourstore'
  ],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Your Street Address',
    addressLocality: 'Your City',
    addressRegion: 'Your State',
    postalCode: 'Your PIN Code',
    addressCountry: 'IN'
  }
}

// Website structured data
export const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Your Store Name',
  url: process.env.NEXT_PUBLIC_SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL}/search?q={search_term_string}`
    },
    'query-input': 'required name=search_term_string'
  }
}

// Product structured data
export function generateProductStructuredData(product: any, variant?: any) {
  const basePrice = variant?.price || product.variants?.[0]?.price || 0
  const compareAtPrice = variant?.compareAtPrice || product.variants?.[0]?.compareAtPrice
  
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images?.map((img: any) => img.url) || [],
    brand: {
      '@type': 'Brand',
      name: product.vendor || 'Your Store'
    },
    sku: variant?.sku || product.variants?.[0]?.sku,
    mpn: variant?.barcode || product.variants?.[0]?.barcode,
    offers: {
      '@type': 'Offer',
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/${product.handle}`,
      priceCurrency: 'INR',
      price: (basePrice / 100).toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
      availability: variant?.inventoryQuantity > 0 || product.variants?.[0]?.inventoryQuantity > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Your Store Name'
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          currency: 'INR',
          value: '150'
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          businessDays: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          },
          cutoffTime: '14:00',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY'
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 3,
            maxValue: 7,
            unitCode: 'DAY'
          }
        }
      }
    },
    aggregateRating: product.reviewSummary && product.reviewSummary.totalReviews > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: (product.reviewSummary.averageRating / 100).toFixed(1),
      reviewCount: product.reviewSummary.totalReviews,
      bestRating: '5',
      worstRating: '1'
    } : undefined,
    review: product.reviews?.slice(0, 5).map((review: any) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.customerName
      },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: '5',
        worstRating: '1'
      },
      reviewBody: review.content,
      datePublished: review.createdAt.toISOString().split('T')[0]
    }))
  }
}

// Collection/Category structured data
export function generateCollectionStructuredData(collection: any, products: any[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: collection.description,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/collections/${collection.handle}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: product.title,
          url: `${process.env.NEXT_PUBLIC_SITE_URL}/products/${product.handle}`,
          image: product.images?.[0]?.url,
          offers: {
            '@type': 'Offer',
            price: (product.variants?.[0]?.price / 100).toFixed(2),
            priceCurrency: 'INR'
          }
        }
      }))
    }
  }
}

// Breadcrumb structured data
export function generateBreadcrumbStructuredData(breadcrumbs: { label: string; href?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: crumb.href ? `${process.env.NEXT_PUBLIC_SITE_URL}${crumb.href}` : undefined
    }))
  }
}

// FAQ structured data
export function generateFAQStructuredData(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  }
}

// Order/Receipt structured data
export function generateOrderStructuredData(order: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Order',
    orderNumber: order.orderNumber,
    orderStatus: 'https://schema.org/OrderProcessing',
    orderDate: order.createdAt.toISOString(),
    seller: {
      '@type': 'Organization',
      name: 'Your Store Name'
    },
    customer: {
      '@type': 'Person',
      name: `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      email: order.email
    },
    acceptedOffer: order.items.map((item: any) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Product',
        name: item.productTitle,
        sku: item.sku
      },
      price: (item.price / 100).toFixed(2),
      priceCurrency: 'INR',
      quantity: item.quantity
    })),
    discount: order.discountAmount ? {
      '@type': 'MonetaryAmount',
      currency: 'INR',
      value: (order.discountAmount / 100).toFixed(2)
    } : undefined,
    totalPaymentDue: {
      '@type': 'PriceSpecification',
      price: (order.totalAmount / 100).toFixed(2),
      priceCurrency: 'INR'
    }
  }
}

// Local Business structured data (for physical stores)
export const localBusinessStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'Your Store Name',
  image: `${process.env.NEXT_PUBLIC_SITE_URL}/store-front.jpg`,
  '@id': process.env.NEXT_PUBLIC_SITE_URL,
  url: process.env.NEXT_PUBLIC_SITE_URL,
  telephone: '+91-1234567890',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Your Street Address',
    addressLocality: 'Your City',
    postalCode: 'Your PIN Code',
    addressCountry: 'IN'
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 19.0760, // Your latitude
    longitude: 72.8777 // Your longitude
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: [
      'Monday',
      'Tuesday', 
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ],
    opens: '09:00',
    closes: '21:00'
  },
  priceRange: '$$'
}

// Helper function to inject structured data
export function injectStructuredData(data: any) {
  return {
    __html: JSON.stringify(data)
  }
}