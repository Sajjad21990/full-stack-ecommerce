'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { 
  Mail,
  UserX,
  UserCheck,
  Shield,
  ShieldOff,
  Lock,
  Trash2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  updateCustomer,
  blockCustomer,
  unblockCustomer,
  resetCustomerPassword,
  deleteCustomer
} from '@/lib/admin/actions/customers'

interface CustomerActionsProps {
  customer: any
}

export default function CustomerActions({ customer }: CustomerActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [editData, setEditData] = useState({
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    status: customer.status
  })
  const [blockReason, setBlockReason] = useState('')

  const handleUpdateCustomer = async () => {
    setLoading('update')
    
    try {
      const result = await updateCustomer({
        customerId: customer.id,
        ...editData
      })
      
      if (result.success) {
        toast.success('Customer updated successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update customer')
      }
    } catch (error) {
      console.error('Error updating customer:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleBlockCustomer = async () => {
    setLoading('block')
    
    try {
      const result = await blockCustomer(customer.id, blockReason)
      
      if (result.success) {
        toast.success('Customer blocked successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to block customer')
      }
    } catch (error) {
      console.error('Error blocking customer:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
      setBlockReason('')
    }
  }

  const handleUnblockCustomer = async () => {
    setLoading('unblock')
    
    try {
      const result = await unblockCustomer(customer.id)
      
      if (result.success) {
        toast.success('Customer unblocked successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to unblock customer')
      }
    } catch (error) {
      console.error('Error unblocking customer:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleToggleEmailVerification = async () => {
    setLoading('verify')
    
    try {
      const result = await updateCustomer({
        customerId: customer.id,
        emailVerified: !customer.emailVerified
      })
      
      if (result.success) {
        toast.success(`Email ${customer.emailVerified ? 'unverified' : 'verified'} successfully`)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update email verification')
      }
    } catch (error) {
      console.error('Error updating email verification:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleResetPassword = async () => {
    setLoading('reset')
    
    try {
      const result = await resetCustomerPassword(customer.id)
      
      if (result.success) {
        toast.success('Password reset successfully. Temporary password sent to customer.')
        // In a real app, you'd send the temp password via email
        console.log('Temporary password:', result.tempPassword)
      } else {
        toast.error(result.error || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteCustomer = async () => {
    setLoading('delete')
    
    try {
      const result = await deleteCustomer(customer.id)
      
      if (result.success) {
        toast.success('Customer deleted successfully')
        router.push('/admin/customers')
      } else {
        toast.error(result.error || 'Failed to delete customer')
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" disabled={loading !== null}>
            <Mail className="mr-2 h-4 w-4" />
            Send Email
          </Button>

          <Button 
            onClick={handleToggleEmailVerification}
            disabled={loading === 'verify'}
            variant="outline"
            className="w-full"
          >
            {loading === 'verify' ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : customer.emailVerified ? (
              <ShieldOff className="mr-2 h-4 w-4" />
            ) : (
              <Shield className="mr-2 h-4 w-4" />
            )}
            {customer.emailVerified ? 'Unverify Email' : 'Verify Email'}
          </Button>

          <Button 
            onClick={handleResetPassword}
            disabled={loading === 'reset'}
            variant="outline"
            className="w-full"
          >
            {loading === 'reset' ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Reset Password
          </Button>

          {customer.status === 'blocked' ? (
            <Button 
              onClick={handleUnblockCustomer}
              disabled={loading === 'unblock'}
              variant="outline"
              className="w-full text-green-600 hover:text-green-700"
            >
              {loading === 'unblock' ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Unblock Customer
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                  <UserX className="mr-2 h-4 w-4" />
                  Block Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Block Customer</DialogTitle>
                  <DialogDescription>
                    This will prevent the customer from accessing their account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Enter reason for blocking..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleBlockCustomer}
                    disabled={loading === 'block'}
                    variant="destructive"
                  >
                    {loading === 'block' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    Block Customer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={editData.email}
              onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={editData.phone}
              onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={editData.status}
              onValueChange={(value) => setEditData(prev => ({ ...prev, status: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleUpdateCustomer}
            disabled={loading === 'update'}
            className="w-full"
          >
            {loading === 'update' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Update Customer
          </Button>
        </CardContent>
      </Card>

      {customer.stats.orderCount === 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This customer has no orders and can be safely deleted.
            </p>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Customer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the customer
                    and remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteCustomer}
                    disabled={loading === 'delete'}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {loading === 'delete' && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    Delete Customer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}