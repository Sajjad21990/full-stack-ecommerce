'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Save,
  ArrowLeft,
  Package,
  Tag,
  DollarSign,
  Search,
  Sparkles,
  Globe,
  Twitter,
  Layers,
  HelpCircle,
  Folder,
  FolderTree,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/lib/admin/actions/products'
import {
  getCollectionsForSelect,
  getCategoriesForSelect,
} from '@/lib/admin/actions/collections-categories'
import { generateSEO } from '@/lib/admin/actions/generate-seo'
import { generateHandle } from '@/lib/utils'
import { toast } from 'sonner'
import { TagsInput } from './tags-input'
import { ProductMediaUpload } from './product-media-upload'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Form validation schema
const productFormSchema = z.object({
  // Basic Information
  title: z.string().min(1, 'Product title is required').max(255),
  handle: z
    .string()
    .min(1, 'Product handle is required')
    .max(255)
    .regex(
      /^[a-z0-9-]+$/,
      'Handle must contain only lowercase letters, numbers, and hyphens'
    ),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']),

  // Pricing
  price: z.number().min(0, 'Price must be positive'),
  compareAtPrice: z.number().min(0).optional(),

  // Organization
  vendor: z.string().optional(),
  productType: z.string().optional(),
  collectionIds: z.array(z.string()).default([]),
  categoryIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),

  // Media
  images: z.array(z.string()).default([]),

  // Inventory
  trackInventory: z.boolean().default(true),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  quantity: z.number().min(0).default(0),

  // SEO & Social Media
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  keywords: z.string().optional(),

  // Open Graph
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),

  // Twitter Card
  twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().optional(),
})

type ProductFormData = z.infer<typeof productFormSchema>

interface ProductFormProps {
  product?: any
  mode: 'create' | 'edit'
}

export function ProductFormImproved({ product, mode }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [collections, setCollections] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // Function to generate SKU
  const generateSKU = (title: string) => {
    const timestamp = Date.now().toString(36).toUpperCase()
    const titlePart =
      title
        .split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'PRD'
    return `${titlePart}-${timestamp}`
  }

  // Initialize form
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: product?.title || '',
      handle: product?.handle || '',
      description: product?.description || '',
      status: product?.status || 'draft',
      price: product?.price ? product.price / 100 : 0,
      compareAtPrice: product?.compareAtPrice
        ? product.compareAtPrice / 100
        : undefined,
      vendor: product?.vendor || '',
      productType: product?.productType || '',
      collectionIds:
        product?.productCollections?.map((pc: any) => pc.collectionId) || [],
      categoryIds:
        product?.productCategories?.map((pc: any) => pc.categoryId) || [],
      tags: product?.tags || [],
      images: product?.images || [],
      trackInventory: product?.trackInventory ?? true,
      sku: product?.sku || (mode === 'create' ? generateSKU('Product') : ''),
      barcode: product?.barcode || '',
      quantity: product?.quantity || 0,
      seoTitle: product?.seoTitle || '',
      seoDescription: product?.seoDescription || '',
      keywords: product?.keywords || '',
      ogTitle: product?.ogTitle || '',
      ogDescription: product?.ogDescription || '',
      ogImage: product?.ogImage || '',
      twitterCard: product?.twitterCard || 'summary_large_image',
      twitterTitle: product?.twitterTitle || '',
      twitterDescription: product?.twitterDescription || '',
      twitterImage: product?.twitterImage || '',
    },
  })

  // Load collections and categories
  useEffect(() => {
    Promise.all([getCollectionsForSelect(), getCategoriesForSelect()]).then(
      ([collectionsData, categoriesData]) => {
        setCollections(collectionsData)
        setCategories(categoriesData)
      }
    )
  }, [])

  // Auto-generate handle and SKU from title
  const watchTitle = form.watch('title')
  useEffect(() => {
    if (watchTitle && mode === 'create') {
      const generatedHandle = generateHandle(watchTitle)
      form.setValue('handle', generatedHandle)

      // Auto-generate SKU if not manually set
      const currentSku = form.getValues('sku')
      if (!currentSku || currentSku.startsWith('PRD-')) {
        form.setValue('sku', generateSKU(watchTitle))
      }
    }
  }, [watchTitle, form, mode])

  // Generate SEO with AI
  const handleGenerateSEO = async () => {
    console.log('Generate SEO button clicked')

    const productData = {
      title: form.getValues('title'),
      description: form.getValues('description'),
      price: form.getValues('price'),
      compareAtPrice: form.getValues('compareAtPrice'),
      tags: form.getValues('tags'),
      vendor: form.getValues('vendor'),
      productType: form.getValues('productType'),
    }

    console.log('Product data for SEO:', productData)

    if (!productData.title) {
      toast.error('Please enter a product title first')
      return
    }

    setIsGeneratingSEO(true)

    try {
      const result = await generateSEO(productData)
      console.log('SEO generation result:', result)

      if (result.success && result.data) {
        // Set SEO fields
        form.setValue('seoTitle', result.data.seoTitle)
        form.setValue('seoDescription', result.data.seoDescription)
        form.setValue('keywords', result.data.keywords)

        // Set Open Graph fields
        form.setValue('ogTitle', result.data.openGraph.title)
        form.setValue('ogDescription', result.data.openGraph.description)

        // Set Twitter Card fields
        form.setValue('twitterCard', result.data.twitter.card as any)
        form.setValue('twitterTitle', result.data.twitter.title)
        form.setValue('twitterDescription', result.data.twitter.description)

        toast.success('SEO data generated successfully')
      } else {
        toast.error(result.error || 'Failed to generate SEO data')
      }
    } catch (error) {
      console.error('Error generating SEO:', error)
      toast.error('Error generating SEO data')
    } finally {
      setIsGeneratingSEO(false)
    }
  }

  // Handle form submission
  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)

    try {
      let result
      if (mode === 'create') {
        result = await createProduct(data as any)
      } else {
        result = await updateProduct(product.id, data as any)
      }

      if (result.success) {
        toast.success(result.message)
        // Always redirect to products page after successful creation/update
        router.push('/admin/products')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error(`Failed to ${mode} product`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle product deletion
  const handleDelete = async () => {
    if (!product?.id || mode !== 'edit') return

    setIsDeleting(true)

    try {
      const result = await deleteProduct(product.id)

      if (result.success) {
        toast.success(result.message)
        router.push('/admin/products')
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error('Failed to delete product')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {mode === 'create' ? 'Create Product' : 'Edit Product'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'create'
                ? 'Add a new product to your catalog'
                : 'Update product information'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {mode === 'edit' && (
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} form="product-form">
            <Save className="mr-2 h-4 w-4" />
            {mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form id="product-form" onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
              <TabsTrigger value="organization">Organization</TabsTrigger>
              <TabsTrigger value="seo">SEO & Social</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Title</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter product title"
                                {...field}
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
                            <FormLabel>URL Handle</FormLabel>
                            <FormControl>
                              <Input placeholder="product-handle" {...field} />
                            </FormControl>
                            <FormDescription>
                              yourstore.com/products/
                              {field.value || 'product-handle'}
                            </FormDescription>
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
                                placeholder="Describe your product"
                                className="min-h-[150px]"
                                {...field}
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Product Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="archived">
                                  Archived
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Active products are visible to customers
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media">
              <ProductMediaUpload
                images={form.watch('images')}
                onImagesChange={(images) => form.setValue('images', images)}
                maxImages={10}
              />
            </TabsContent>

            {/* Pricing & Inventory Tab */}
            <TabsContent value="pricing" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormLabel>Price</FormLabel>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    The selling price customers will pay
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="compareAtPrice"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2">
                              <FormLabel>Compare at Price</FormLabel>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Original price to show discount
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    parseFloat(e.target.value) || undefined
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Price Preview */}
                    {form.watch('price') > 0 && (
                      <div className="rounded-lg bg-muted/50 p-4">
                        <p className="mb-2 text-sm font-medium">
                          Customer sees:
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            ${form.watch('price')?.toFixed(2)}
                          </span>
                          {form.watch('compareAtPrice') &&
                            form.watch('compareAtPrice')! >
                              form.watch('price') && (
                              <>
                                <span className="text-lg text-muted-foreground line-through">
                                  ${form.watch('compareAtPrice')?.toFixed(2)}
                                </span>
                                <Badge variant="secondary">
                                  {Math.round(
                                    ((form.watch('compareAtPrice')! -
                                      form.watch('price')) /
                                      form.watch('compareAtPrice')!) *
                                      100
                                  )}
                                  % OFF
                                </Badge>
                              </>
                            )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Inventory</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="trackInventory"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-x-2">
                          <div>
                            <FormLabel>Track Inventory</FormLabel>
                            <FormDescription>
                              Monitor stock levels
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('trackInventory') && (
                      <>
                        <FormField
                          control={form.control}
                          name="sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Auto-generated"
                                    {...field}
                                    className="pr-20"
                                  />
                                  {mode === 'create' && (
                                    <Badge
                                      variant="secondary"
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
                                    >
                                      Auto
                                    </Badge>
                                  )}
                                </div>
                              </FormControl>
                              <FormDescription>
                                {mode === 'create'
                                  ? 'Auto-generated from product title. You can edit if needed.'
                                  : 'Product SKU for inventory tracking'}
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="barcode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Barcode (ISBN, UPC, GTIN, etc.)
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="1234567890" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Organization Tab */}
            <TabsContent value="organization" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Product Organization
                    </CardTitle>
                    <CardDescription>
                      Organize your product for better discovery
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <div className="flex items-center gap-2">
                              Vendor
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    The manufacturer or brand of the product
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Nike, Apple, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="productType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <div className="flex items-center gap-2">
                              Product Type
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    The type of product (e.g., Shoes, T-Shirt,
                                    Electronics)
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Shoes, T-Shirt, etc."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Collections & Categories - Compact Design */}
                <Card>
                  <CardHeader>
                    <CardTitle>Organization</CardTitle>
                    <CardDescription>
                      Group your product in collections and categories
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Collections */}
                    <FormField
                      control={form.control}
                      name="collectionIds"
                      render={({ field }) => (
                        <FormItem>
                          <div className="mb-3 flex items-center gap-2">
                            <Folder className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-sm font-medium">
                              Collections
                            </FormLabel>
                            <span className="text-xs text-muted-foreground">
                              (Marketing groups)
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {collections.length === 0 ? (
                              <p className="text-sm italic text-muted-foreground">
                                No collections available. Create collections to
                                group products.
                              </p>
                            ) : (
                              collections.map((collection) => {
                                const isSelected = field.value?.includes(
                                  collection.id
                                )
                                return (
                                  <Badge
                                    key={collection.id}
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="cursor-pointer transition-all hover:scale-105"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      const updated = isSelected
                                        ? field.value?.filter(
                                            (id) => id !== collection.id
                                          ) || []
                                        : [
                                            ...(field.value || []),
                                            collection.id,
                                          ]
                                      field.onChange(updated)
                                    }}
                                  >
                                    {isSelected && (
                                      <Check className="mr-1 h-3 w-3" />
                                    )}
                                    {collection.title}
                                  </Badge>
                                )
                              })
                            )}
                          </div>
                          {field.value && field.value.length > 0 && (
                            <div className="mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  field.onChange([])
                                }}
                                className="h-7 text-xs"
                              >
                                <X className="mr-1 h-3 w-3" />
                                Clear collections
                              </Button>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Categories */}
                    <FormField
                      control={form.control}
                      name="categoryIds"
                      render={({ field }) => (
                        <FormItem>
                          <div className="mb-3 flex items-center gap-2">
                            <FolderTree className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-sm font-medium">
                              Categories
                            </FormLabel>
                            <span className="text-xs text-muted-foreground">
                              (Navigation hierarchy)
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {categories.length === 0 ? (
                              <p className="text-sm italic text-muted-foreground">
                                No categories available. Create categories for
                                product navigation.
                              </p>
                            ) : (
                              categories.map((category) => {
                                const isSelected = field.value?.includes(
                                  category.id
                                )
                                return (
                                  <Badge
                                    key={category.id}
                                    variant={
                                      isSelected ? 'secondary' : 'outline'
                                    }
                                    className="cursor-pointer transition-all hover:scale-105"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      const updated = isSelected
                                        ? field.value?.filter(
                                            (id) => id !== category.id
                                          ) || []
                                        : [...(field.value || []), category.id]
                                      field.onChange(updated)
                                    }}
                                  >
                                    {isSelected && (
                                      <Check className="mr-1 h-3 w-3" />
                                    )}
                                    {category.name}
                                  </Badge>
                                )
                              })
                            )}
                          </div>
                          {field.value && field.value.length > 0 && (
                            <div className="mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  field.onChange([])
                                }}
                                className="h-7 text-xs"
                              >
                                <X className="mr-1 h-3 w-3" />
                                Clear categories
                              </Button>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <TagsInput
                  selectedTags={form.watch('tags')}
                  onTagsChange={(tags) => form.setValue('tags', tags)}
                />
              </div>
            </TabsContent>

            {/* SEO & Social Tab */}
            <TabsContent value="seo" className="space-y-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Search Engine Optimization
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleGenerateSEO()
                  }}
                  disabled={isGeneratingSEO}
                  title={
                    !form.watch('title')
                      ? 'Enter a product title first'
                      : 'Generate SEO metadata'
                  }
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isGeneratingSEO ? 'Generating...' : 'Generate with AI'}
                </Button>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Search Results Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="seoTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="SEO optimized title"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/70 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seoDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Description for search engines"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/160 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="keywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Keywords</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="keyword1, keyword2, keyword3"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Comma-separated keywords for SEO
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Google Preview */}
                    <div className="space-y-1 rounded-lg bg-muted/50 p-4">
                      <p className="text-sm font-medium text-blue-600">
                        {form.watch('seoTitle') ||
                          form.watch('title') ||
                          'Page Title'}
                      </p>
                      <p className="text-xs text-green-600">
                        yourstore.com/products/
                        {form.watch('handle') || 'product'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {form.watch('seoDescription') ||
                          form.watch('description')?.substring(0, 160) ||
                          'Page description will appear here'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Open Graph
                    </CardTitle>
                    <CardDescription>
                      How your product appears when shared on social media
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="ogTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OG Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Title for social sharing"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ogDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OG Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Description for social sharing"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Twitter className="h-5 w-5" />
                      Twitter Card
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="twitterCard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Card Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="summary">Summary</SelectItem>
                              <SelectItem value="summary_large_image">
                                Summary Large Image
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="twitterTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Title for Twitter" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="twitterDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Description for Twitter"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone and will also delete all variants, options, and images
              associated with this product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
