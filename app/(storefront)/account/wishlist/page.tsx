import { Metadata } from 'next'
import { getWishlist } from '@/lib/storefront/actions/wishlist'
import { WishlistItems } from '@/components/storefront/wishlist/wishlist-items'
import { EmptyWishlist } from '@/components/storefront/wishlist/empty-wishlist'
import { Breadcrumbs } from '@/components/storefront/common/breadcrumbs'
import { Heart, Share2, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'My Wishlist | Saved Items',
  description: 'View and manage your saved items and favorites.',
}

export default async function WishlistPage() {
  // TODO: Get customer ID from authentication
  const wishlist = await getWishlist()

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Account', href: '/account' },
    { label: 'Wishlist' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbs} />
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <Heart className="w-6 h-6 text-pink-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
                <p className="text-gray-600">
                  {wishlist?.items?.length ? `${wishlist.items.length} saved items` : 'No items saved yet'}
                </p>
              </div>
            </div>
            
            {wishlist?.items?.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share List
                </Button>
                <Button variant="outline" size="sm">
                  <Gift className="w-4 h-4 mr-2" />
                  Create Gift List
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!wishlist || wishlist.items.length === 0 ? (
          <EmptyWishlist />
        ) : (
          <WishlistItems wishlist={wishlist} />
        )}
      </div>
    </div>
  )
}