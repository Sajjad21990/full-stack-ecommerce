import { NextResponse } from 'next/server'
import { db } from '@/db'
import { eq, and, ilike, sql, desc, or } from 'drizzle-orm'
import { products } from '@/db/schema/products'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const searchTerm = `%${query}%`

    // Get product suggestions
    const [productSuggestions, popularTerms] = await Promise.all([
      // Product-based suggestions
      db
        .select({
          type: sql<string>`'product'`,
          id: products.id,
          title: products.title,
          handle: products.handle,
          price: products.price,
          image: sql<string>`(
          SELECT pi.url 
          FROM product_images pi 
          WHERE pi.product_id = ${products.id} 
          ORDER BY pi.position 
          LIMIT 1
        )`,
          relevanceScore: sql<number>`
          CASE 
            WHEN ${products.title} ILIKE ${query + '%'} THEN 100
            WHEN ${products.title} ILIKE ${searchTerm} THEN 90
            WHEN ${products.description} ILIKE ${searchTerm} THEN 80
            WHEN ${products.vendor} ILIKE ${searchTerm} THEN 70
            ELSE 60
          END
        `,
        })
        .from(products)
        .where(
          and(
            eq(products.status, 'active'),
            or(
              ilike(products.title, searchTerm),
              ilike(products.description, searchTerm),
              ilike(products.vendor, searchTerm),
              sql`${products.tags}::text ILIKE ${searchTerm}`
            )
          )
        )
        .orderBy(sql`relevanceScore DESC, ${products.createdAt} DESC`)
        .limit(8),

      // Popular search terms (categories, brands, types)
      db
        .select({
          type: sql<string>`'category'`,
          term: products.productType,
          count: sql<number>`COUNT(*)`,
          relevanceScore: sql<number>`
          CASE 
            WHEN ${products.productType} ILIKE ${query + '%'} THEN 100
            WHEN ${products.productType} ILIKE ${searchTerm} THEN 90
            ELSE 70
          END
        `,
        })
        .from(products)
        .where(
          and(
            eq(products.status, 'active'),
            sql`${products.productType} IS NOT NULL`,
            ilike(products.productType, searchTerm)
          )
        )
        .groupBy(products.productType)
        .having(sql`COUNT(*) > 0`)
        .orderBy(sql`relevanceScore DESC, COUNT(*) DESC`)
        .limit(5),
    ])

    // Get brand suggestions
    const brandSuggestions = await db
      .select({
        type: sql<string>`'brand'`,
        term: products.vendor,
        count: sql<number>`COUNT(*)`,
        relevanceScore: sql<number>`
        CASE 
          WHEN ${products.vendor} ILIKE ${query + '%'} THEN 100
          WHEN ${products.vendor} ILIKE ${searchTerm} THEN 90
          ELSE 70
        END
      `,
      })
      .from(products)
      .where(
        and(
          eq(products.status, 'active'),
          sql`${products.vendor} IS NOT NULL`,
          ilike(products.vendor, searchTerm)
        )
      )
      .groupBy(products.vendor)
      .having(sql`COUNT(*) > 0`)
      .orderBy(sql`relevanceScore DESC, COUNT(*) DESC`)
      .limit(3)

    // Combine and format suggestions
    const suggestions = [
      // Products
      ...productSuggestions.map((item) => ({
        type: 'product',
        id: item.id,
        title: item.title,
        subtitle: `Product`,
        url: `/products/${item.handle}`,
        image: item.image,
        price: item.price,
        relevanceScore: item.relevanceScore,
      })),
      // Categories
      ...popularTerms.map((item) => ({
        type: 'category',
        id: `category-${item.term}`,
        title: item.term!,
        subtitle: `${item.count} products`,
        url: `/search?category=${encodeURIComponent(item.term!)}`,
        relevanceScore: item.relevanceScore,
      })),
      // Brands
      ...brandSuggestions.map((item) => ({
        type: 'brand',
        id: `brand-${item.term}`,
        title: item.term!,
        subtitle: `${item.count} products`,
        url: `/search?brand=${encodeURIComponent(item.term!)}`,
        relevanceScore: item.relevanceScore,
      })),
    ]

    // Sort by relevance and limit results
    const sortedSuggestions = suggestions
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, 12)

    return NextResponse.json({ suggestions: sortedSuggestions })
  } catch (error) {
    console.error('Search suggestions API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    )
  }
}
