'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
  Plus, 
  X, 
  Save, 
  ArrowLeft, 
  Package, 
  Tag,
  DollarSign,
  Truck,
  BarChart3,
  HelpCircle
} from 'lucide-react'
import { createProduct, updateProduct } from '@/lib/admin/actions/products'
import { generateHandle } from '@/lib/utils'
import { toast } from 'sonner'
import { TagsInput } from './tags-input'
import { ProductMediaUpload } from './product-media-upload'

// Form validation schema
const productFormSchema = z.object({
  title: z.string().min(1, 'Product title is required').max(255),
  handle: z.string().min(1, 'Product handle is required').max(255)
    .regex(/^[a-z0-9-]+$/, 'Handle must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']),
  price: z.number().min(0, 'Price must be positive'),
  compareAtPrice: z.number().min(0).optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string()).default([]),
  trackInventory: z.boolean().default(true),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  
  // Product options (Size, Color, etc.)
  options: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Option name is required'),
    values: z.array(z.string().min(1, 'Option value is required')),
  })).default([]),
  
  // Product variants
  variants: z.array(z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Variant title is required'),
    price: z.number().min(0, 'Price must be positive'),
    sku: z.string().optional(),
    inventoryQuantity: z.number().min(0).default(0),
    option1: z.string().optional(),
    option2: z.string().optional(),
    option3: z.string().optional(),
  })).default([]),
})

type ProductFormData = z.infer<typeof productFormSchema>

interface ProductFormProps {
  product?: any // Existing product data for editing
  mode: 'create' | 'edit'
}

export function ProductForm({ product, mode }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Initialize form with default values
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: product?.title || '',
      handle: product?.handle || '',
      description: product?.description || '',
      status: product?.status || 'draft',
      price: product?.price ? product.price / 100 : 0,
      compareAtPrice: product?.compareAtPrice ? product.compareAtPrice / 100 : undefined,
      vendor: product?.vendor || '',
      productType: product?.productType || '',
      tags: product?.tags || [],
      images: product?.images || [],
      trackInventory: product?.trackInventory ?? true,
      seoTitle: product?.seoTitle || '',
      seoDescription: product?.seoDescription || '',
      options: product?.productOptions?.map((option: any) => ({
        id: option.id,
        name: option.name,
        values: option.optionValues?.map((v: any) => v.value) || []
      })) || [],
      variants: product?.productVariants?.map((variant: any) => ({
        id: variant.id,
        title: variant.title,
        price: variant.price / 100,
        sku: variant.sku,
        inventoryQuantity: variant.inventoryQuantity,
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3,
      })) || [
        {
          title: 'Default',
          price: 0,
          sku: '',
          inventoryQuantity: 0,
          option1: '',
          option2: '',
          option3: '',
        }
      ],
    },
  })

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: 'options',
  })

  const { fields: variantFields, append: appendVariant, remove: removeVariant, replace: replaceVariants } = useFieldArray({
    control: form.control,
    name: 'variants',
  })

  // Auto-generate handle from title
  const watchTitle = form.watch('title')
  useEffect(() => {
    if (watchTitle && mode === 'create') {
      const generatedHandle = generateHandle(watchTitle)
      form.setValue('handle', generatedHandle)
    }
  }, [watchTitle, form, mode])

  // Generate variants based on options
  const generateVariants = () => {
    const options = form.getValues('options')
    if (options.length === 0) {
      // No options, keep single default variant
      replaceVariants([{
        title: 'Default',
        price: form.getValues('price'),
        sku: '',
        inventoryQuantity: 0,
        option1: '',
        option2: '',
        option3: '',
      }])
      return
    }

    const basePrice = form.getValues('price')
    const combinations: string[][] = []
    
    // Generate all combinations of option values
    const generateCombinations = (optionIndex: number, current: string[]) => {
      if (optionIndex >= options.length) {
        combinations.push([...current])
        return
      }
      
      for (const value of options[optionIndex].values) {
        current.push(value)
        generateCombinations(optionIndex + 1, current)
        current.pop()
      }
    }
    
    generateCombinations(0, [])
    
    const newVariants = combinations.map(combination => ({
      title: combination.join(' / '),
      price: basePrice,
      sku: '',
      inventoryQuantity: 0,
      option1: combination[0] || '',
      option2: combination[1] || '',
      option3: combination[2] || '',
    }))
    
    replaceVariants(newVariants)
  }


  // Handle form submission
  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)
    
    try {
      let result
      if (mode === 'create') {
        result = await createProduct(data)
      } else {
        result = await updateProduct(product.id, data)
      }
      
      if (result.success) {
        toast.success(result.message)
        if (mode === 'create' && result.productId) {
          router.push(`/admin/products/${result.productId}`)
        } else {
          router.push('/admin/products')
        }
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error(`Failed to ${mode} product`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between pb-6 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === 'create' ? 'Create Product' : 'Edit Product'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === 'create' 
                ? 'Add a new product to your catalog'
                : 'Update product information and variants'
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} form="product-form">
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {mode === 'create' ? 'Create Product' : 'Save Changes'}
              </>
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Information
                  </CardTitle>
                  <CardDescription>
                    Basic details about your product
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product title" {...field} />
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
                        <FormLabel>Product Handle</FormLabel>
                        <FormControl>
                          <Input placeholder="product-handle" {...field} />
                        </FormControl>
                        <FormDescription>
                          Used in the product URL. Only lowercase letters, numbers, and hyphens.
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
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Product Images */}
              <ProductMediaUpload
                images={form.watch('images')}
                onImagesChange={(images) => form.setValue('images', images)}
                maxImages={10}
              />

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Pricing
                  </CardTitle>
                  <CardDescription>
                    Set your product pricing and display options for discounts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormLabel>Price *</FormLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>The selling price of your product. This is what customers will pay.</p>
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
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            The actual selling price in USD
                          </FormDescription>
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
                                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>The original price before discount. When set higher than the selling price, customers will see the discount amount and percentage. Leave empty if not on sale.</p>
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
                              onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormDescription>
                            Show original price to highlight savings (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Pricing Preview */}
                  {form.watch('price') > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <h4 className="text-sm font-medium mb-2">Pricing Preview</h4>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl font-bold">
                          ${form.watch('price')?.toFixed(2)}
                        </div>
                        {form.watch('compareAtPrice') && form.watch('compareAtPrice')! > form.watch('price') && (
                          <>
                            <div className="text-lg text-muted-foreground line-through">
                              ${form.watch('compareAtPrice')?.toFixed(2)}
                            </div>
                            <Badge variant="secondary">
                              Save {Math.round(((form.watch('compareAtPrice')! - form.watch('price')) / form.watch('compareAtPrice')!) * 100)}%
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Options & Variants */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Options & Variants</CardTitle>
                  <CardDescription>
                    Configure product options like Size, Color, etc. and manage variants
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Options */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">Options</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendOption({ name: '', values: [''] })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                    
                    {optionFields.map((field, index) => (
                      <Card key={field.id} className="mb-4">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-4">
                              <FormField
                                control={form.control}
                                name={`options.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Option Name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., Size, Color" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`options.${index}.values`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Option Values</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Enter values separated by commas"
                                        value={field.value.join(', ')}
                                        onChange={(e) => {
                                          const values = e.target.value.split(',').map(v => v.trim()).filter(Boolean)
                                          field.onChange(values)
                                        }}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      e.g., Small, Medium, Large
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeOption(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {optionFields.length > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={generateVariants}
                        className="mb-4"
                      >
                        Generate Variants
                      </Button>
                    )}
                  </div>

                  <Separator />

                  {/* Variants */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Variants</h3>
                    {variantFields.map((field, index) => (
                      <Card key={field.id} className="mb-4">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name={`variants.${index}.title`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Variant Title</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Variant name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`variants.${index}.price`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Price</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        {...field}
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`variants.${index}.sku`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>SKU</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Product SKU" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name={`variants.${index}.inventoryQuantity`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Inventory</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {variantFields.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => removeVariant(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => appendVariant({
                        title: '',
                        price: form.getValues('price'),
                        sku: '',
                        inventoryQuantity: 0,
                        option1: '',
                        option2: '',
                        option3: '',
                      })}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Variant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              
              {/* Status & Organization */}
              <Card>
                <CardHeader>
                  <CardTitle>Status & Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                </CardContent>
              </Card>

              {/* Tags */}
              <TagsInput
                selectedTags={form.watch('tags')}
                onTagsChange={(tags) => form.setValue('tags', tags)}
              />

              {/* Inventory */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="trackInventory"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Track Inventory</FormLabel>
                          <FormDescription>
                            Monitor stock levels for this product
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
                </CardContent>
              </Card>

              {/* SEO */}
              <Card>
                <CardHeader>
                  <CardTitle>Search Engine Optimization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="seoTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Title</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="seoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="SEO description"
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

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Product Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Product Status</CardTitle>
                  <CardDescription>
                    Control the visibility and availability of your product
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
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Draft products are not visible to customers
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Product Organization */}
              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                  <CardDescription>
                    Organize your product with vendor and type information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Nike, Apple" {...field} />
                        </FormControl>
                        <FormDescription>
                          The company or brand that makes this product
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Clothing, Electronics" {...field} />
                        </FormControl>
                        <FormDescription>
                          Category or type of product for organization
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* SEO Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Search Engine Optimization</CardTitle>
                  <CardDescription>
                    Improve how this product appears in search results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="seoTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Title</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO-friendly title" {...field} />
                        </FormControl>
                        <FormDescription>
                          Appears in search engine results (recommended: 50-60 characters)
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
                        <FormLabel>SEO Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description for search engines"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Meta description for search results (recommended: 150-160 characters)
                        </FormDescription>
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
    </div>
  )
}