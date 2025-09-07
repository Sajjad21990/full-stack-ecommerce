'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MoreHorizontal, 
  Edit, 
  Trash, 
  UserX, 
  UserCheck, 
  Shield,
  ChevronLeft,
  ChevronRight,
  Users,
  UserMinus
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { 
  updateUser, 
  deleteUser, 
  suspendUser, 
  reactivateUser,
  bulkUpdateUserRoles,
  bulkUpdateUserStatus
} from '@/lib/admin/actions/users'

interface User {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'manager' | 'staff' | 'customer'
  status: 'active' | 'inactive' | 'suspended'
  emailVerified: Date | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date | null
}

interface UsersTableProps {
  users: User[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  currentFilters: any
}

export function UsersTable({ users, pagination, currentFilters }: UsersTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(users.map(user => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    }
  }

  const handleBulkRoleUpdate = async (role: string) => {
    if (selectedUsers.length === 0) return

    startTransition(async () => {
      const result = await bulkUpdateUserRoles(selectedUsers, role)
      if (result.success) {
        toast.success(`Updated ${result.updatedCount} users to ${role}`)
        setSelectedUsers([])
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update user roles')
      }
    })
  }

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedUsers.length === 0) return

    startTransition(async () => {
      const result = await bulkUpdateUserStatus(selectedUsers, status)
      if (result.success) {
        toast.success(`Updated ${result.updatedCount} users to ${status}`)
        setSelectedUsers([])
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update user status')
      }
    })
  }

  const handleUserAction = async (userId: string, action: string) => {
    setIsDeleting(userId)
    
    try {
      let result
      switch (action) {
        case 'suspend':
          result = await suspendUser(userId)
          break
        case 'reactivate':
          result = await reactivateUser(userId)
          break
        case 'delete':
          result = await deleteUser(userId)
          break
        default:
          return
      }

      if (result.success) {
        toast.success(`User ${action}d successfully`)
        router.refresh()
      } else {
        toast.error(result.error || `Failed to ${action} user`)
      }
    } finally {
      setIsDeleting(null)
    }
  }

  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>
    }
  }

  const getRoleBadge = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="bg-purple-500">Admin</Badge>
      case 'manager':
        return <Badge variant="default" className="bg-blue-500">Manager</Badge>
      case 'staff':
        return <Badge variant="default" className="bg-indigo-500">Staff</Badge>
      case 'customer':
        return <Badge variant="outline">Customer</Badge>
    }
  }

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(window.location.search)
    params.set('page', page.toString())
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedUsers.length} user(s) selected
              </span>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isPending}>
                      <Users className="mr-2 h-4 w-4" />
                      Update Role
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkRoleUpdate('admin')}>
                      Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkRoleUpdate('manager')}>
                      Manager
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkRoleUpdate('staff')}>
                      Staff
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkRoleUpdate('customer')}>
                      Customer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isPending}>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Update Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('active')}>
                      Activate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('inactive')}>
                      Deactivate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkStatusUpdate('suspended')}>
                      Suspend
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUsers([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {user.emailVerified && (
                          <div className="text-xs text-green-600">✓ Verified</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getRoleBadge(user.role)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.status)}
                  </TableCell>
                  <TableCell>
                    {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                  </TableCell>
                  <TableCell>
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0"
                          disabled={isDeleting === user.id}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        
                        {user.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handleUserAction(user.id, 'suspend')}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Suspend
                          </DropdownMenuItem>
                        )}
                        
                        {user.status === 'suspended' && (
                          <DropdownMenuItem
                            onClick={() => handleUserAction(user.id, 'reactivate')}
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem
                          onClick={() => handleUserAction(user.id, 'delete')}
                          className="text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {users.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-semibold">No users found</h3>
              <p>No users match your current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}