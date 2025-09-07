'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DiscountForm from '@/components/admin/discounts/discount-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createDiscount } from '@/lib/admin/actions/discounts'
import { toast } from 'sonner'

export default function CreateDiscountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: any) => {
    setLoading(true)
    try {
      const result = await createDiscount(data)
      
      if (result.success) {
        toast.success('Discount created successfully')
        router.push(`/admin/discounts/${result.discountId}`)
      } else {
        toast.error(result.error || 'Failed to create discount')
      }
    } catch (error) {
      console.error('Error creating discount:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/discounts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Discount</h1>
          <p className="text-muted-foreground">
            Create a new discount code or automatic promotion
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discount Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DiscountForm 
            onSubmit={handleSubmit}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  )
}