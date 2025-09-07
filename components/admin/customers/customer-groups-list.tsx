'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Plus,
  RefreshCw
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  createCustomerGroup, 
  updateCustomerGroup, 
  deleteCustomerGroup 
} from '@/lib/admin/actions/customers'

interface CustomerGroupsListProps {
  groups: Array<{
    id: string
    name: string
    description: string | null
    memberCount: number
    createdAt: Date
    updatedAt: Date
  }>
}

export default function CustomerGroupsList({ groups }: CustomerGroupsListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const resetForm = () => {
    setFormData({ name: '', description: '' })
    setSelectedGroup(null)
  }

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a group name')
      return
    }

    setLoading('create')
    
    try {
      const result = await createCustomerGroup({
        name: formData.name,
        description: formData.description || undefined
      })
      
      if (result.success) {
        toast.success('Customer group created successfully')
        setCreateDialogOpen(false)
        resetForm()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to create group')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateGroup = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a group name')
      return
    }

    setLoading('update')
    
    try {
      const result = await updateCustomerGroup(selectedGroup.id, {
        name: formData.name,
        description: formData.description || undefined
      })
      
      if (result.success) {
        toast.success('Customer group updated successfully')
        setEditDialogOpen(false)
        resetForm()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update group')
      }
    } catch (error) {
      console.error('Error updating group:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    setLoading(groupId)
    
    try {
      const result = await deleteCustomerGroup(groupId)
      
      if (result.success) {
        toast.success('Customer group deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete group')
      }
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const openEditDialog = (group: any) => {
    setSelectedGroup(group)
    setFormData({
      name: group.name,
      description: group.description || ''
    })
    setEditDialogOpen(true)
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No customer groups yet</h3>
        <p className="text-muted-foreground mb-6">
          Create your first customer group to start organizing your customers.
        </p>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Customer Group</DialogTitle>
              <DialogDescription>
                Create a new customer group to organize your customers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., VIP Customers, New Customers"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this customer group..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateGroup}
                disabled={loading === 'create'}
              >
                {loading === 'create' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Customer Group</DialogTitle>
              <DialogDescription>
                Create a new customer group to organize your customers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-name">Group Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., VIP Customers, New Customers"
                />
              </div>
              <div>
                <Label htmlFor="create-description">Description (Optional)</Label>
                <Textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this customer group..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleCreateGroup}
                disabled={loading === 'create'}
              >
                {loading === 'create' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      disabled={loading === group.id}
                    >
                      {loading === group.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => openEditDialog(group)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Group
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/customers?groupId=${group.id}`}>
                        <Users className="mr-2 h-4 w-4" />
                        View Members
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Group
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Customer Group</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{group.name}"? This will remove
                            all customers from this group but will not delete the customers themselves.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteGroup(group.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Group
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {group.description && (
                <p className="text-sm text-muted-foreground">{group.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <Badge variant="outline">
                  {formatDate(new Date(group.createdAt))}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer Group</DialogTitle>
            <DialogDescription>
              Update the customer group information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Group Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., VIP Customers, New Customers"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this customer group..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleUpdateGroup}
              disabled={loading === 'update'}
            >
              {loading === 'update' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Update Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}