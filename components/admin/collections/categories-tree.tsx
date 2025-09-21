'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { deleteCategory } from '@/lib/admin/actions/collections'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  name: string
  handle: string
  parentId: string | null
  level: number
  productCount: number
}

interface CategoriesTreeProps {
  categories: Category[]
}

export function CategoriesTree({ categories }: CategoriesTreeProps) {
  const router = useRouter()
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      return
    }

    setLoadingId(id)
    try {
      const result = await deleteCategory(id)
      if (result.success) {
        toast.success('Category deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete category')
      }
    } catch (error) {
      toast.error('Failed to delete category')
    } finally {
      setLoadingId(null)
    }
  }

  // Build tree structure
  const buildTree = (parentId: string | null = null): Category[] => {
    return categories
      .filter((cat) => cat.parentId === parentId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const renderCategory = (category: Category) => {
    const children = buildTree(category.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedIds.has(category.id)

    return (
      <div key={category.id}>
        <div className="group flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/50">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {/* Toggle button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 flex-shrink-0 p-0"
              onClick={() => hasChildren && toggleExpanded(category.id)}
              disabled={!hasChildren}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )
              ) : (
                <div className="h-3 w-3" />
              )}
            </Button>

            {/* Folder icon */}
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 flex-shrink-0 text-blue-500" />
              ) : (
                <Folder className="h-4 w-4 flex-shrink-0 text-blue-500" />
              )
            ) : (
              <div className="h-4 w-4 flex-shrink-0 rounded border border-dashed border-muted-foreground/30" />
            )}

            {/* Category info */}
            <div className="min-w-0 flex-1">
              <Link
                href={`/admin/categories/${category.id}`}
                className="block truncate text-sm font-medium hover:underline"
              >
                {category.name}
              </Link>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  /{category.handle}
                </span>
                {category.productCount > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                    {category.productCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/categories/${category.id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/categories/new?parent=${category.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Child
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDelete(category.id, category.name)}
                  disabled={loadingId === category.id}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-6 border-l border-muted-foreground/20">
            <div className="ml-4">
              {children.map((child) => renderCategory(child))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const rootCategories = buildTree()

  if (categories.length === 0) {
    return (
      <div className="py-8 text-center">
        <Folder className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold">No categories</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Create categories to organize your products.
        </p>
        <div className="mt-4">
          <Button size="sm" asChild>
            <Link href="/admin/collections/categories/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Category
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium">
          {categories.length} categories
        </span>
        <Button size="sm" variant="outline" asChild>
          <Link href="/admin/collections/categories/new">
            <Plus className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="space-y-1">
        {rootCategories.map((category) => renderCategory(category))}
      </div>
    </div>
  )
}
