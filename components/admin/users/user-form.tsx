'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { createUser, updateUser } from '@/lib/admin/actions/users'
import { Eye, EyeOff, Save, Loader2 } from 'lucide-react'

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'manager', 'staff', 'customer']),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  sendInvite: z.boolean().optional()
})

type UserFormData = z.infer<typeof userSchema>

interface UserFormProps {
  user?: {
    id: string
    email: string
    name: string | null
    role: 'admin' | 'manager' | 'staff' | 'customer'
    status: 'active' | 'inactive' | 'suspended'
  }
  onSuccess?: () => void
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const isEditing = !!user

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: user?.email || '',
      name: user?.name || '',
      role: user?.role || 'customer',
      status: user?.status || 'active',
      password: '',
      sendInvite: !isEditing
    }
  })

  const onSubmit = (data: UserFormData) => {
    startTransition(async () => {
      try {
        let result

        if (isEditing) {
          result = await updateUser({
            id: user.id,
            name: data.name,
            role: data.role,
            status: data.status,
            password: data.password || undefined
          })
        } else {
          result = await createUser({
            email: data.email,
            name: data.name,
            role: data.role,
            status: data.status,
            password: data.password,
            sendInvite: data.sendInvite
          })
        }

        if (result.success) {
          toast.success(isEditing ? 'User updated successfully' : 'User created successfully')
          if (onSuccess) {
            onSuccess()
          } else {
            router.push('/admin/users')
          }
        } else {
          toast.error(result.error || `Failed to ${isEditing ? 'update' : 'create'} user`)
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
        console.error('User form error:', error)
      }
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          {...form.register('email')}
          disabled={isEditing || isPending}
          placeholder="user@example.com"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          {...form.register('name')}
          disabled={isPending}
          placeholder="John Doe"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label>Role</Label>
        <Select 
          value={form.watch('role')} 
          onValueChange={(value) => form.setValue('role', value as any)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.role && (
          <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
        )}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>Status</Label>
        <Select 
          value={form.watch('status')} 
          onValueChange={(value) => form.setValue('status', value as any)}
          disabled={isPending}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.status && (
          <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">
          {isEditing ? 'New Password (optional)' : 'Password'}
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...form.register('password')}
            disabled={isPending}
            placeholder={isEditing ? 'Leave empty to keep current password' : 'Enter password'}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {form.formState.errors.password && (
          <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>

      {/* Send Invite (only for new users) */}
      {!isEditing && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sendInvite"
            checked={form.watch('sendInvite')}
            onCheckedChange={(checked) => form.setValue('sendInvite', checked as boolean)}
            disabled={isPending}
          />
          <Label htmlFor="sendInvite" className="text-sm">
            Send invitation email to user
          </Label>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Update User' : 'Create User'}
            </>
          )}
        </Button>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push('/admin/users')}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}