'use client'

import Link from 'next/link'
import { X, ChevronRight, User, Heart, ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  navigation: Array<{ name: string; href: string }>
}

export function MobileMenu({ isOpen, onClose, navigation }: MobileMenuProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Menu Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 bottom-0 w-80 bg-white z-50 transform transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-xl font-bold">Menu</span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto">
            <div className="py-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium">{item.name}</span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
              ))}
            </div>

            {/* Categories */}
            <div className="border-t py-4">
              <h3 className="px-4 text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                Categories
              </h3>
              {['Men', 'Women', 'Kids', 'Accessories'].map((category) => (
                <Link
                  key={category}
                  href={`/collections/${category.toLowerCase()}`}
                  onClick={onClose}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span>{category}</span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Link>
              ))}
            </div>

            {/* Account Links */}
            <div className="border-t py-4">
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <User className="h-5 w-5" />
                <span>My Account</span>
              </Link>
              <Link
                href="/wishlist"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <Heart className="h-5 w-5" />
                <span>Wishlist</span>
              </Link>
              <Link
                href="/cart"
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <ShoppingBag className="h-5 w-5" />
                <span>Shopping Cart</span>
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <p className="text-sm text-gray-500 text-center">
              Need help? Call us at <a href="tel:1800123456" className="font-medium">1800-123-456</a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}