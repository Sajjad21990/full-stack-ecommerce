'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { createCollection, updateCollection, isCollectionHandleAvailable } from '@/lib/admin/actions/collections'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

const collectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  handle: z.string().min(1, 'Handle is required').regex(/^[a-z0-9-]+$/, 'Handle can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  image: z.string().optional(),
  status: z.enum(['draft', 'active']),
  rulesType: z.enum(['manual', 'automated']),
  position: z.coerce.number().default(0)
})

type CollectionFormData = z.infer<typeof collectionSchema>

interface CollectionFormProps {
  collection?: {
    id: string
    title: string
    handle: string
    description?: string
    image?: string
    status: 'draft' | 'active'
    rulesType: 'manual' | 'automated'
    position: number
  }
}

export function CollectionForm({ collection }: CollectionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEditing = Boolean(collection)

  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      title: collection?.title || '',
      handle: collection?.handle || '',
      description: collection?.description || '',
      image: collection?.image || '',
      status: collection?.status || 'draft',
      rulesType: collection?.rulesType || 'manual',
      position: collection?.position || 0
    }
  })

  const generateHandle = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const onSubmit = async (data: CollectionFormData) => {
    setLoading(true)
    try {
      // Check handle availability
      if (!isEditing || data.handle !== collection.handle) {
        const isAvailable = await isCollectionHandleAvailable(data.handle, collection?.id)
        if (!isAvailable) {
          form.setError('handle', { message: 'This handle is already in use' })
          setLoading(false)
          return
        }
      }

      const result = isEditing 
        ? await updateCollection({ ...data, id: collection.id })
        : await createCollection(data)

      if (result.success) {
        toast.success(isEditing ? 'Collection updated successfully' : 'Collection created successfully')
        router.push('/admin/collections')
      } else {
        toast.error(result.error || 'Something went wrong')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/collections">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1" />
          <Button type="submit" disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Saving...' : isEditing ? 'Update Collection' : 'Create Collection'}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Essential details about your collection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., Summer Collection"
                          onChange={(e) => {
                            field.onChange(e)
                            if (!isEditing && !form.getFieldState('handle').isDirty) {
                              form.setValue('handle', generateHandle(e.target.value))
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Handle</FormLabel>
                      <FormControl>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 text-sm text-muted-foreground bg-muted border border-r-0 border-input rounded-l-md">
                            /collections/
                          </span>
                          <Input 
                            {...field} 
                            placeholder="summer-collection"
                            className="rounded-l-none"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Describe your collection..."
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="https://example.com/image.jpg"
                          type="url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                  Configure collection behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rulesType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="automated">Automated</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        {form.watch('rulesType') === 'manual' 
                          ? 'Manually select products to include'
                          : 'Automatically include products based on rules'
                        }
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          min="0"
                          placeholder="0"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Display order (0 = first)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Preview */}
            {form.watch('image') && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <img 
                    src={form.watch('image')} 
                    alt="Collection preview"
                    className="w-full h-32 object-cover rounded-md"
                    onError={(e) => {
                      e.currentTarget.src = ''
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </Form>
  )
}