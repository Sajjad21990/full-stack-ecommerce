'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ShoppingBag, 
  Search, 
  User, 
  Menu, 
  X,
  Heart,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SearchModal } from './search-modal'
import { MobileMenu } from './mobile-menu'
import { CartDrawer } from '../cart/cart-drawer'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'All Products', href: '/collections/all' },
  { name: 'Collections', href: '/collections' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' },
]

export function Header() {
  const pathname = usePathname()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b">
        {/* Top Bar */}
        <div className="bg-gray-900 text-white text-sm py-2 px-4 text-center">
          <p>Free shipping on orders over ₹999 | Easy returns</p>
        </div>

        {/* Main Header */}
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-gray-900">STORE</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-gray-900",
                    pathname === item.href
                      ? "text-gray-900 border-b-2 border-gray-900"
                      : "text-gray-600"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              
              <Link
                href="/account"
                className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Account"
              >
                <User className="h-5 w-5" />
              </Link>
              
              <Link
                href="/wishlist"
                className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Wishlist"
              >
                <Heart className="h-5 w-5" />
              </Link>
              
              <button
                onClick={() => setIsCartOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
                aria-label="Cart"
              >
                <ShoppingBag className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-gray-900 text-white text-xs rounded-full flex items-center justify-center">
                  0
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Bar (Desktop) */}
        <div className="hidden lg:block border-t bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center space-x-8 py-3">
              <Link href="/collections/all?type=mens" className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900">
                Men
              </Link>
              <Link href="/collections/all?type=womens" className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900">
                Women
              </Link>
              <Link href="/collections/all?type=kids" className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900">
                Kids
              </Link>
              <Link href="/collections/all?type=accessories" className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900">
                Accessories
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* Mobile Menu */}
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
        navigation={navigation}
      />
      
      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  )
}