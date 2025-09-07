'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Package,
  ShoppingCart,
  Users,
  Tag,
  BarChart,
  Settings,
  Home,
  FileText,
  Image,
  LogOut,
  UserCheck,
  Warehouse,
  Shield,
  Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'

const navigationItems = [
  {
    title: 'Overview',
    items: [
      { icon: Home, label: 'Dashboard', href: '/admin', exactMatch: true },
      { icon: BarChart, label: 'Analytics', href: '/admin/analytics' },
    ]
  },
  {
    title: 'Catalog',
    items: [
      { icon: Package, label: 'Products', href: '/admin/products' },
      { icon: Warehouse, label: 'Inventory', href: '/admin/inventory' },
      { icon: FileText, label: 'Collections', href: '/admin/collections' },
      { icon: Image, label: 'Media', href: '/admin/media' },
    ]
  },
  {
    title: 'Sales',
    items: [
      { icon: ShoppingCart, label: 'Orders', href: '/admin/orders' },
      { icon: Users, label: 'Customers', href: '/admin/customers' },
      { icon: Tag, label: 'Discounts', href: '/admin/discounts' },
    ]
  },
  {
    title: 'Settings',
    items: [
      { icon: UserCheck, label: 'Users', href: '/admin/users' },
      { icon: Shield, label: 'Audit Logs', href: '/admin/audit' },
      { icon: Download, label: 'Export / Import', href: '/admin/export-import' },
      { icon: Settings, label: 'General', href: '/admin/settings' },
    ]
  }
]

interface AdminSidebarProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string, exactMatch = false) => {
    if (exactMatch) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/10">
      {/* Logo/Brand */}
      <div className="border-b px-6 py-4">
        <Link href="/admin" className="flex items-center gap-2">
          <Package className="h-6 w-6" />
          <span className="text-lg font-semibold">Admin Panel</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-6 px-3 py-4">
        {navigationItems.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href, item.exactMatch)
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active 
                        ? "bg-accent text-accent-foreground" 
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t px-3 py-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}