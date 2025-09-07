'use client'

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const generatePages = () => {
    const pages: (number | string)[] = []
    const showEllipsis = totalPages > 7

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage <= 4) {
        // Show first 5 pages + ellipsis + last page
        for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
          pages.push(i)
        }
        if (totalPages > 5) {
          pages.push('ellipsis')
          pages.push(totalPages)
        }
      } else if (currentPage >= totalPages - 3) {
        // Show first page + ellipsis + last 5 pages
        pages.push('ellipsis')
        for (let i = Math.max(totalPages - 4, 2); i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        // Show first page + ellipsis + current-1, current, current+1 + ellipsis + last page
        pages.push('ellipsis')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('ellipsis')
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) {
    return null
  }

  const pages = generatePages()

  return (
    <div className={cn("flex items-center justify-center space-x-1", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      <div className="flex items-center space-x-1">
        {pages.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <div key={`ellipsis-${index}`} className="flex items-center justify-center w-9 h-9">
                <MoreHorizontal className="h-4 w-4" />
              </div>
            )
          }

          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page as number)}
              className="w-9 h-9 p-0"
            >
              {page}
            </Button>
          )
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="gap-1"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// Additional exports for compatibility with shadcn/ui pattern
export const PaginationContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex items-center space-x-1", className)}>{children}</div>
)

export const PaginationItem = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={className}>{children}</div>
)

export const PaginationLink = ({ 
  children, 
  isActive, 
  onClick,
  className 
}: { 
  children: React.ReactNode
  isActive?: boolean
  onClick?: () => void
  className?: string 
}) => (
  <Button
    variant={isActive ? "default" : "outline"}
    size="sm"
    onClick={onClick}
    className={cn("w-9 h-9 p-0", className)}
  >
    {children}
  </Button>
)

export const PaginationPrevious = ({ 
  onClick,
  disabled,
  className 
}: { 
  onClick?: () => void
  disabled?: boolean
  className?: string 
}) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className={cn("gap-1", className)}
  >
    <ChevronLeft className="h-4 w-4" />
    Previous
  </Button>
)

export const PaginationNext = ({ 
  onClick,
  disabled,
  className 
}: { 
  onClick?: () => void
  disabled?: boolean
  className?: string 
}) => (
  <Button
    variant="outline"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className={cn("gap-1", className)}
  >
    Next
    <ChevronRight className="h-4 w-4" />
  </Button>
)

export const PaginationEllipsis = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center w-9 h-9", className)}>
    <MoreHorizontal className="h-4 w-4" />
  </div>
)