import { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw, Home, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Offline | You\'re currently offline',
  description: 'Check your internet connection and try again.',
}

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {/* Offline Icon */}
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <WifiOff className="w-8 h-8 text-gray-400" />
          </div>

          {/* Message */}
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">
            You're offline
          </h1>
          <p className="text-gray-600 mb-8">
            It looks like you've lost your internet connection. 
            Don't worry - your cart items are saved locally!
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>

          {/* Offline Features */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              While you're offline, you can still:
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Browse your saved items
              </li>
              <li className="flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2" />
                View your shopping cart
              </li>
              <li className="flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Read previously loaded content
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> Once you're back online, all your cart changes will sync automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}