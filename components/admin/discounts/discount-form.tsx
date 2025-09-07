'use client'

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarIcon, Plus, X } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import ProductSelector from '@/components/admin/shared/product-selector'
import CollectionSelector from '@/components/admin/shared/collection-selector'

const discountSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  code: z.string().min(1, 'Discount code is required').toUpperCase(),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y']),
  value: z.number().min(0, 'Value must be positive'),
  
  // Application
  appliesToType: z.enum(['all', 'products', 'collections']),
  selectedProducts: z.array(z.string()).optional(),
  selectedCollections: z.array(z.string()).optional(),
  minimumAmount: z.number().optional(),
  maximumAmount: z.number().optional(),
  
  // Usage limits
  usageLimit: z.number().optional(),
  usageLimitPerCustomer: z.number().optional(),
  oncePerCustomer: z.boolean(),
  
  // Customer eligibility
  customerEligibility: z.enum(['all', 'specific', 'groups']),
  selectedCustomers: z.array(z.string()).optional(),
  
  // Buy X Get Y
  prerequisiteQuantity: z.number().optional(),
  entitledQuantity: z.number().optional(),
  
  // Scheduling
  startsAt: z.date().optional(),
  endsAt: z.date().optional(),
  
  // Settings
  combinesWithProductDiscounts: z.boolean(),
  combinesWithOrderDiscounts: z.boolean(),
  combinesWithShippingDiscounts: z.boolean(),
})

type DiscountFormValues = z.infer<typeof discountSchema>

interface DiscountFormProps {
  discount?: any
  onSubmit: (data: DiscountFormValues) => void
  loading?: boolean
}

export default function DiscountForm({ discount, onSubmit, loading }: DiscountFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      title: discount?.title || '',
      code: discount?.code || '',
      description: discount?.description || '',
      type: discount?.type || 'percentage',
      value: discount?.value || 0,
      appliesToType: discount?.appliesToType || 'all',
      selectedProducts: discount?.products?.map((p: any) => p.productId) || [],
      selectedCollections: discount?.collections?.map((c: any) => c.collectionId) || [],
      minimumAmount: discount?.minimumAmount || undefined,
      maximumAmount: discount?.maximumAmount || undefined,
      usageLimit: discount?.usageLimit || undefined,
      usageLimitPerCustomer: discount?.usageLimitPerCustomer || undefined,
      oncePerCustomer: discount?.oncePerCustomer || false,
      customerEligibility: discount?.customerEligibility || 'all',
      selectedCustomers: discount?.prerequisiteCustomerIds || [],
      prerequisiteQuantity: discount?.prerequisiteQuantity || undefined,
      entitledQuantity: discount?.entitledQuantity || undefined,
      startsAt: discount?.startsAt ? new Date(discount.startsAt) : undefined,
      endsAt: discount?.endsAt ? new Date(discount.endsAt) : undefined,
      combinesWithProductDiscounts: discount?.combinesWith?.productDiscounts || false,
      combinesWithOrderDiscounts: discount?.combinesWith?.orderDiscounts || false,
      combinesWithShippingDiscounts: discount?.combinesWith?.shippingDiscounts || false,
    }
  })

  const discountType = form.watch('type')
  const appliesToType = form.watch('appliesToType')
  const customerEligibility = form.watch('customerEligibility')

  const handleGenerateCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    form.setValue('code', code)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6">
          {/* Basic Information */}
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
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Sale 20% Off" {...field} />
                    </FormControl>
                    <FormDescription>
                      Internal name for this discount
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Code</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="SUMMER20" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleGenerateCode}
                      >
                        Generate
                      </Button>
                    </div>
                    <FormDescription>
                      The code customers will enter at checkout
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Save 20% on all summer collection items"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Discount Type & Value */}
          <Card>
            <CardHeader>
              <CardTitle>Discount Type & Value</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                          <SelectItem value="free_shipping">Free Shipping</SelectItem>
                          <SelectItem value="buy_x_get_y">Buy X Get Y</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {discountType === 'percentage' ? 'Percentage Off' : 
                         discountType === 'fixed_amount' ? 'Amount Off' : 'Value'}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          {discountType === 'percentage' && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2">%</span>
                          )}
                          {discountType === 'fixed_amount' && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2">₹</span>
                          )}
                          <Input 
                            type="number"
                            className={cn(
                              discountType === 'percentage' && "pr-8",
                              discountType === 'fixed_amount' && "pl-8"
                            )}
                            disabled={discountType === 'free_shipping'}
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {discountType === 'buy_x_get_y' && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="prerequisiteQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Buy Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="3"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Customer must buy this quantity</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="entitledQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Get Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>Customer gets this quantity free</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Applies To */}
          <Card>
            <CardHeader>
              <CardTitle>Applies To</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="appliesToType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apply Discount To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="products">Specific Products</SelectItem>
                        <SelectItem value="collections">Specific Collections</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {appliesToType === 'products' && (
                <FormField
                  control={form.control}
                  name="selectedProducts"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Products</FormLabel>
                      <FormControl>
                        <ProductSelector
                          value={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {appliesToType === 'collections' && (
                <FormField
                  control={form.control}
                  name="selectedCollections"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Collections</FormLabel>
                      <FormControl>
                        <CollectionSelector
                          value={field.value || []}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minimumAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Purchase Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2">₹</span>
                          <Input 
                            type="number"
                            className="pl-8"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Minimum order value to apply discount
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {discountType === 'percentage' && (
                  <FormField
                    control={form.control}
                    name="maximumAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Discount Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2">₹</span>
                            <Input 
                              type="number"
                              className="pl-8"
                              placeholder="No limit"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Cap the discount at this amount
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Limits */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="usageLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Usage Limit</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="No limit"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for unlimited usage
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="usageLimitPerCustomer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usage Limit Per Customer</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="No limit"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        How many times each customer can use
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="oncePerCustomer"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        One use per customer
                      </FormLabel>
                      <FormDescription>
                        Each customer can only use this discount once
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

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startsAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the discount becomes active
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endsAt"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => {
                              const startsAt = form.getValues('startsAt')
                              return date < (startsAt || new Date())
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        When the discount expires
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Combination Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Combination Settings</CardTitle>
              <CardDescription>
                Choose which other discount types this can combine with
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="combinesWithProductDiscounts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Product discounts
                      </FormLabel>
                      <FormDescription>
                        Can combine with discounts on specific products
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

              <FormField
                control={form.control}
                name="combinesWithOrderDiscounts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Order discounts
                      </FormLabel>
                      <FormDescription>
                        Can combine with order-level discounts
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

              <FormField
                control={form.control}
                name="combinesWithShippingDiscounts"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Shipping discounts
                      </FormLabel>
                      <FormDescription>
                        Can combine with free or discounted shipping
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
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : discount ? 'Update Discount' : 'Create Discount'}
          </Button>
        </div>
      </form>
    </Form>
  )
}