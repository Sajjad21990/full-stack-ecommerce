import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Heart, ArrowRight, Sparkles } from 'lucide-react'

export function EmptyWishlist() {
  const suggestedCategories = [
    { name: 'Electronics', href: '/collections/electronics' },
    { name: 'Fashion', href: '/collections/fashion' },
    { name: 'Home & Garden', href: '/collections/home-garden' },
    { name: 'Sports', href: '/collections/sports' }
  ]

  return (
    <div className="max-w-md mx-auto text-center py-16">
      <Card>
        <CardContent className="p-8">
          {/* Empty State Icon */}
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-pink-400" />
          </div>
          
          {/* Message */}
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Your wishlist is empty
          </h2>
          <p className="text-gray-600 mb-8">
            Save items you love by clicking the heart icon on any product. 
            We'll keep them safe here for you!
          </p>
          
          {/* CTA */}
          <Button asChild className="mb-6">
            <Link href="/">
              Start Shopping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          
          {/* Tips */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Pro Tip</span>
            </div>
            <p className="text-sm text-blue-800">
              Items in your wishlist won't expire and you'll get notified of price drops!
            </p>
          </div>
          
          {/* Quick Categories */}
          <div>
            <p className="text-sm font-medium text-gray-900 mb-3">
              Browse popular categories
            </p>
            <div className="grid grid-cols-2 gap-2">
              {suggestedCategories.map((category) => (
                <Button
                  key={category.name}
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs"
                >
                  <Link href={category.href}>
                    {category.name}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}