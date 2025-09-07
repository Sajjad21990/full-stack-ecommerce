'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Edit, Trash2, Eye, Package, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDate, formatCompactNumber } from '@/lib/utils'
import { deleteCollection } from '@/lib/admin/actions/collections'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Pagination } from '@/components/ui/pagination'

interface CollectionsTableProps {
  collections: any[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  currentFilters: any
}

export function CollectionsTable({ collections, pagination, currentFilters }: CollectionsTableProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    setLoadingId(id)
    try {
      const result = await deleteCollection(id)
      if (result.success) {
        toast.success('Collection deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete collection')
      }
    } catch (error) {
      toast.error('Failed to delete collection')
    } finally {
      setLoadingId(null)
    }
  }

  if (collections.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No collections</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new collection.</p>
        <div className="mt-6">
          <Button asChild>
            <Link href="/admin/collections/new">Create Collection</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Collection</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((collection) => (
              <TableRow key={collection.id}>
                <TableCell>
                  {collection.image ? (
                    <img 
                      src={collection.image} 
                      alt={collection.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <Link 
                      href={`/admin/collections/${collection.id}`}
                      className="font-medium hover:underline"
                    >
                      {collection.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      /{collection.handle}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={collection.status === 'active' ? 'default' : 'secondary'}>
                    {collection.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{formatCompactNumber(collection.productCount || 0)}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {collection.rulesType}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(collection.createdAt)}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/collections/${collection.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/collections/${collection.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(collection.id, collection.title)}
                        disabled={loadingId === collection.id}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          onPageChange={(page) => {
            const params = new URLSearchParams()
            Object.entries(currentFilters).forEach(([key, value]) => {
              if (value && key !== 'page') {
                params.set(key, value.toString())
              }
            })
            params.set('page', page.toString())
            router.push(`?${params.toString()}`)
          }}
        />
      )}
    </div>
  )
}