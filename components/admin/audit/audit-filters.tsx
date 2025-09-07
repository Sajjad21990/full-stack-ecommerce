'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

interface AuditFiltersProps {
  filters?: any
}

export default function AuditFilters({ filters }: AuditFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit logs..."
            className="pl-10"
            defaultValue={filters?.search}
          />
        </div>
      </div>
      
      <Select defaultValue={filters?.action || 'all'}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          <SelectItem value="create">Create</SelectItem>
          <SelectItem value="update">Update</SelectItem>
          <SelectItem value="delete">Delete</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue={filters?.entity || 'all'}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Entities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entities</SelectItem>
          <SelectItem value="product">Products</SelectItem>
          <SelectItem value="order">Orders</SelectItem>
          <SelectItem value="customer">Customers</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}