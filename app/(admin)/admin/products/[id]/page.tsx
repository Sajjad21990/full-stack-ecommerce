import { notFound } from 'next/navigation'
import { ProductFormImproved } from '@/components/admin/products/product-form-improved'
import { getProductById } from '@/lib/admin/queries/products'

interface ProductEditPageProps {
  params: {
    id: string
  }
}

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const product = await getProductById(params.id)
  
  if (!product) {
    notFound()
  }

  return <ProductFormImproved mode="edit" product={product} />
}