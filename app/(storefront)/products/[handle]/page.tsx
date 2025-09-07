import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProductByHandle } from '@/lib/storefront/queries/products'
import { ProductImages } from '@/components/storefront/product/product-images'
import { ProductInfo } from '@/components/storefront/product/product-info'
import { ProductTabs } from '@/components/storefront/product/product-tabs'
import { RelatedProducts } from '@/components/storefront/product/related-products'
import { ProductRecommendations } from '@/components/storefront/product/product-recommendations'
import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'
import { generateBreadcrumbs } from '@/lib/storefront/utils'

interface ProductPageProps {
  params: {
    handle: string
  }
}

export async function generateMetadata(
  { params }: ProductPageProps
): Promise<Metadata> {
  const product = await getProductByHandle(params.handle)
  
  if (!product) {
    return {
      title: 'Product Not Found',
    }
  }

  const productImage = product.images?.[0]?.url

  return {
    title: product.title,
    description: product.description || `Shop ${product.title} from our collection`,
    openGraph: {
      title: product.title,
      description: product.description || `Shop ${product.title} from our collection`,
      images: productImage ? [productImage] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: product.description || `Shop ${product.title} from our collection`,
      images: productImage ? [productImage] : [],
    },
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductByHandle(params.handle)

  if (!product) {
    notFound()
  }

  const breadcrumbs = generateBreadcrumbs(`/products/${params.handle}`, {
    [params.handle]: product.title
  })

  // Structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images?.map(img => img.url) || [],
    offers: {
      '@type': 'Offer',
      price: product.variants[0]?.price || product.price,
      priceCurrency: 'INR',
      availability: product.variants.some(v => v.inventoryQuantity > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumbs */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        </div>

        {/* Product Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-8">
              {/* Product Images */}
              <ProductImages 
                images={product.images || []}
                title={product.title}
              />

              {/* Product Info */}
              <ProductInfo product={product} />
            </div>

            {/* Product Tabs - Description, Specifications, etc */}
            <ProductTabs product={product} />
          </div>

          {/* Related Products */}
          {product.relatedProducts && product.relatedProducts.length > 0 && (
            <RelatedProducts products={product.relatedProducts} />
          )}
        </div>

        {/* Product Recommendations */}
        <ProductRecommendations 
          productId={product.id}
          title="You Might Also Like"
          strategy="similar"
          limit={8}
          showViewAll={true}
        />

        {/* Upsell Recommendations */}
        <ProductRecommendations 
          productId={product.id}
          title="Upgrade Your Choice"
          strategy="upsell"
          limit={4}
        />
      </div>
    </>
  )
}