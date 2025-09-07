'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw, Home, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {/* Offline Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <WifiOff className="h-8 w-8 text-gray-400" />
          </div>

          {/* Message */}
          <h1 className="mb-4 text-2xl font-semibold text-gray-900">
            You&apos;re offline
          </h1>
          <p className="mb-8 text-gray-600">
            It looks like you&apos;ve lost your internet connection. Don&apos;t
            worry - your cart items are saved locally!
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>

          {/* Offline Features */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="mb-3 text-sm font-medium text-gray-900">
              While you&apos;re offline, you can still:
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Browse your saved items
              </li>
              <li className="flex items-center">
                <ShoppingBag className="mr-2 h-4 w-4" />
                View your shopping cart
              </li>
              <li className="flex items-center">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Read previously loaded content
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <p className="text-xs text-blue-800">
              <strong>Tip:</strong> Once you&apos;re back online, all your cart
              changes will sync automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
