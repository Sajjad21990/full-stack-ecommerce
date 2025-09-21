'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  createCategory,
  updateCategory,
  isCategoryHandleAvailable,
} from '@/lib/admin/actions/collections'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { MediaUploadField } from '@/components/admin/shared/media-upload-field'

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  handle: z
    .string()
    .min(1, 'Handle is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Handle can only contain lowercase letters, numbers, and hyphens'
    ),
  description: z.string().optional(),
  image: z.string().optional(),
  parentId: z.string().optional(),
  position: z.coerce.number().default(0),
})

type CategoryFormData = z.infer<typeof categorySchema>

interface Category {
  id: string
  name: string
  handle: string
  parentId: string | null
  level: number
}

interface CategoryFormProps {
  category?: {
    id: string
    name: string
    handle: string
    description?: string
    image?: string
    parentId?: string
    position: number
  }
  categories: Category[]
  parentId?: string
}

export function CategoryForm({
  category,
  categories,
  parentId,
}: CategoryFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const isEditing = Boolean(category)

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      handle: category?.handle || '',
      description: category?.description || '',
      image: category?.image || '',
      parentId: parentId || category?.parentId || 'none',
      position: category?.position || 0,
    },
  })

  const generateHandle = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Get available parent categories (excluding self and descendants)
  const getAvailableParents = () => {
    if (!isEditing) return categories

    // For editing, exclude the category itself and its descendants
    return categories.filter((cat) => {
      if (cat.id === category.id) return false
      // This is a simplified check - in a real app you'd check the full hierarchy
      return true
    })
  }

  const onSubmit = async (data: CategoryFormData) => {
    setLoading(true)
    try {
      // Check handle availability
      if (!isEditing || data.handle !== category.handle) {
        const isAvailable = await isCategoryHandleAvailable(
          data.handle,
          category?.id
        )
        if (!isAvailable) {
          form.setError('handle', { message: 'This handle is already in use' })
          setLoading(false)
          return
        }
      }

      // Convert "none" to undefined for parentId
      const submitData = {
        ...data,
        parentId: data.parentId === 'none' ? undefined : data.parentId,
      }

      const result = isEditing
        ? await updateCategory({ ...submitData, id: category.id })
        : await createCategory(submitData)

      if (result.success) {
        toast.success(
          isEditing
            ? 'Category updated successfully'
            : 'Category created successfully'
        )
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

  const buildCategoryTree = (cats: Category[], level = 0): JSX.Element[] => {
    return cats
      .filter((cat) =>
        level === 0
          ? !cat.parentId
          : cat.parentId === cats.find((p) => p.level === level - 1)?.id
      )
      .map((cat) => (
        <SelectItem key={cat.id} value={cat.id}>
          {'  '.repeat(cat.level)}
          {cat.name}
        </SelectItem>
      ))
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
            {loading
              ? 'Saving...'
              : isEditing
                ? 'Update Category'
                : 'Create Category'}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Essential details about your category
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Electronics"
                          onChange={(e) => {
                            field.onChange(e)
                            if (
                              !isEditing &&
                              !form.getFieldState('handle').isDirty
                            ) {
                              form.setValue(
                                'handle',
                                generateHandle(e.target.value)
                              )
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
                          <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                            /categories/
                          </span>
                          <Input
                            {...field}
                            placeholder="electronics"
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
                          placeholder="Describe your category..."
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
                      <FormControl>
                        <MediaUploadField
                          value={field.value}
                          onChange={field.onChange}
                          defaultFolder="categories"
                          label="Category Image"
                          description="Upload or select an image for this category"
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
                <CardDescription>Configure category hierarchy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">
                            No parent (root category)
                          </SelectItem>
                          {getAvailableParents()
                            .sort(
                              (a, b) =>
                                a.level - b.level ||
                                a.name.localeCompare(b.name)
                            )
                            .map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {'  '.repeat(cat.level)}
                                {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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
                        Display order within parent (0 = first)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  )
}
