import { NextResponse } from 'next/server'
import { searchProducts } from '@/lib/storefront/queries/products'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')

    // Extract filters
    const filters = {
      minPrice: searchParams.get('minPrice')
        ? parseInt(searchParams.get('minPrice')!)
        : undefined,
      maxPrice: searchParams.get('maxPrice')
        ? parseInt(searchParams.get('maxPrice')!)
        : undefined,
      vendor: searchParams.getAll('brand').filter(Boolean),
      productType: searchParams.getAll('category').filter(Boolean),
      inStock: searchParams.get('inStock') === 'true',
      sortBy: (searchParams.get('sortBy') as any) || 'relevance',
    }

    const result = await searchProducts(query, filters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    )
  }
}
