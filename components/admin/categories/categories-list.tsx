'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Plus,
  ArrowUpDown,
} from 'lucide-react'
import {
  deleteCategory,
  bulkDeleteCategories,
} from '@/lib/admin/actions/collections'
import { toast } from 'sonner'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  handle: string
  description?: string | null
  image?: string | null
  parentId?: string | null
  path: string
  level: number
  position: number
  isActive: boolean
  productCount: number
  createdAt: Date
  updatedAt: Date
}

interface CategoriesListProps {
  categories: Category[]
}

export function CategoriesList({
  categories: initialCategories,
}: CategoriesListProps) {
  const router = useRouter()
  const [categories] = useState(initialCategories)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // Build tree structure
  const buildTree = (
    items: Category[],
    parentId: string | null = null
  ): Category[] => {
    return items
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
  }

  const getChildren = (parentId: string): Category[] => {
    return categories.filter((cat) => cat.parentId === parentId)
  }

  const hasChildren = (id: string): boolean => {
    return categories.some((cat) => cat.parentId === id)
  }

  // Filter categories based on search
  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.handle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Organize categories by hierarchy
  const rootCategories = buildTree(filteredCategories, null)

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedCategories)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedCategories(newSelection)
  }

  const selectAll = () => {
    if (selectedCategories.size === filteredCategories.length) {
      setSelectedCategories(new Set())
    } else {
      setSelectedCategories(new Set(filteredCategories.map((c) => c.id)))
    }
  }

  const handleDelete = async () => {
    if (!categoryToDelete) return

    const result = await deleteCategory(categoryToDelete)
    if (result.success) {
      toast.success('Category deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete category')
    }

    setDeleteDialogOpen(false)
    setCategoryToDelete(null)
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedCategories)
    const result = await bulkDeleteCategories(ids)

    if (result.success) {
      toast.success(result.message || 'Categories deleted successfully')
      setSelectedCategories(new Set())
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete categories')
    }

    setBulkDeleteDialogOpen(false)
  }

  const renderCategory = (category: Category, depth = 0) => {
    const children = getChildren(category.id)
    const hasSubcategories = children.length > 0
    const isExpanded = expandedCategories.has(category.id)

    return (
      <div key={category.id}>
        <div
          className="flex items-center gap-2 border-b p-3 hover:bg-muted/50"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <Checkbox
            checked={selectedCategories.has(category.id)}
            onCheckedChange={() => toggleSelection(category.id)}
          />

          {hasSubcategories && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => toggleExpanded(category.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}

          {!hasSubcategories && <div className="w-6" />}

          <div className="flex flex-1 items-center gap-2">
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground" />
            )}

            <Link
              href={`/admin/categories/${category.id}`}
              className="font-medium hover:underline"
            >
              {category.name}
            </Link>

            <Badge variant="secondary" className="ml-2">
              {category.productCount} products
            </Badge>

            <span className="ml-auto text-sm text-muted-foreground">
              /{category.handle}
            </span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
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
                  Add Subcategory
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setCategoryToDelete(category.id)
                  setDeleteDialogOpen(true)
                }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded &&
          children.map((child) => renderCategory(child, depth + 1))}
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>
                {categories.length} total categories
              </CardDescription>
            </div>
            {selectedCategories.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedCategories.size} selected
                </Badge>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Search and filters */}
          <div className="border-b p-4">
            <div className="flex items-center gap-2">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setExpandedCategories(new Set(categories.map((c) => c.id)))
                }
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedCategories(new Set())}
              >
                Collapse All
              </Button>
            </div>
          </div>

          {/* Categories Tree */}
          <div className="min-h-[400px]">
            {/* Header */}
            <div className="flex items-center gap-2 border-b bg-muted/30 p-3 text-sm font-medium">
              <Checkbox
                checked={
                  selectedCategories.size === filteredCategories.length &&
                  filteredCategories.length > 0
                }
                onCheckedChange={selectAll}
              />
              <div className="w-6" />
              <div className="flex-1">Category</div>
            </div>

            {/* Categories */}
            {rootCategories.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery ? 'No categories found' : 'No categories yet'}
              </div>
            ) : (
              rootCategories.map((category) => renderCategory(category))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This will also
              remove it from all products. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Categories</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCategories.size}{' '}
              categories? This will also remove them from all products. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
