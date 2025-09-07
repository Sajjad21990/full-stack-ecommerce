'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter } from 'lucide-react'

interface CollectionsSortDropdownProps {
  currentSort?: string
}

export function CollectionsSortDropdown({ currentSort = 'title-asc' }: CollectionsSortDropdownProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', e.target.value)
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-gray-500" />
      <select
        name="sort"
        value={currentSort}
        onChange={handleSortChange}
        className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-black"
      >
        <option value="title-asc">A to Z</option>
        <option value="title-desc">Z to A</option>
        <option value="created-desc">Newest First</option>
        <option value="created-asc">Oldest First</option>
      </select>
    </div>
  )
}