import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Heart, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Wishlist | Shop',
  description: 'Your saved items',
}

export default function WishlistPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Wishlist' }
  ]

  // For now, we'll show an empty wishlist
  const wishlistItems: any[] = []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbs} className="mb-6" />
        
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>
          
          {wishlistItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Wishlist items would go here */}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-2xl font-semibold mb-2">Your wishlist is empty</h2>
              <p className="text-gray-600 mb-6">
                Save items you love to your wishlist and shop them anytime
              </p>
              <Link href="/collections/all">
                <Button size="lg" className="gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Start Shopping
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}