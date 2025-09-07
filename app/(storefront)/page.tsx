import { Suspense } from 'react'
import Link from 'next/link'
import { getFeaturedProducts } from '@/lib/storefront/queries/products'
import { ProductGrid } from '@/components/storefront/product/product-grid'
import { CollectionCard } from '@/components/storefront/collection/collection-card'
import { Button } from '@/components/ui/button'
import { ArrowRight, ShoppingBag, Sparkles, Truck } from 'lucide-react'
import { db } from '@/db'
import { collections, categories } from '@/db/schema/collections'
import { eq, desc } from 'drizzle-orm'

async function getActiveCollections() {
  try {
    const result = await db
      .select({
        id: collections.id,
        title: collections.title,
        handle: collections.handle,
        description: collections.description,
        image: collections.image,
      })
      .from(collections)
      .where(eq(collections.status, 'active'))
      .orderBy(desc(collections.sortOrder))
      .limit(4)
    
    return result
  } catch (error) {
    console.error('Error fetching collections:', error)
    return []
  }
}

async function getActiveCategories() {
  try {
    const result = await db
      .select({
        id: categories.id,
        name: categories.name,
        handle: categories.handle,
        description: categories.description,
        image: categories.image,
      })
      .from(categories)
      .where(eq(categories.status, 'active'))
      .orderBy(categories.name)
      .limit(6)
    
    return result
  } catch (error) {
    console.error('Error fetching categories:', error)
    return []
  }
}

export default async function Home() {
  const [featuredProducts, activeCollections, activeCategories] = await Promise.all([
    getFeaturedProducts(8),
    getActiveCollections(),
    getActiveCategories()
  ])

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary/10 to-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome to Our Store
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover amazing products at unbeatable prices
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/collections">
                <Button size="lg" className="gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Shop Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/products">
                <Button size="lg" variant="outline">
                  Browse All Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Truck className="h-10 w-10 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Free Shipping</h3>
              <p className="text-sm text-muted-foreground">On orders over $50</p>
            </div>
            <div className="text-center">
              <Sparkles className="h-10 w-10 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Premium Quality</h3>
              <p className="text-sm text-muted-foreground">Carefully curated products</p>
            </div>
            <div className="text-center">
              <ShoppingBag className="h-10 w-10 mx-auto mb-4 text-primary" />
              <h3 className="font-semibold mb-2">Secure Checkout</h3>
              <p className="text-sm text-muted-foreground">Safe & encrypted payments</p>
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      {activeCollections.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Shop by Collection</h2>
              <Link href="/collections">
                <Button variant="ghost" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {activeCollections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {activeCategories.length > 0 && (
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Shop by Category</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {activeCategories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categories/${category.handle}`}
                  className="group"
                >
                  <div className="bg-background rounded-lg p-6 text-center hover:shadow-lg transition-shadow">
                    {category.image && (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-16 h-16 mx-auto mb-3 object-contain"
                      />
                    )}
                    <h3 className="font-medium group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Featured Products</h2>
            <Link href="/products">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Suspense fallback={<div>Loading products...</div>}>
            <ProductGrid products={featuredProducts} />
          </Suspense>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Join Our Newsletter</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Subscribe to get special offers, free giveaways, and exclusive deals.
          </p>
          <div className="flex gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <Button>Subscribe</Button>
          </div>
        </div>
      </section>
    </main>
  )
}