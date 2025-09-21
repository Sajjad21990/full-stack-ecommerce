import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { products, productVariants } from '@/db/schema/products'
import { createId } from '@paralleldrive/cuid2'
import { generateHandle } from '@/lib/utils'

interface CSVRow {
  title: string
  handle?: string
  description?: string
  price: string
  compare_at_price?: string
  vendor?: string
  product_type?: string
  tags?: string
  track_inventory?: string
  sku?: string
  quantity?: string
  status?: string
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file || !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Please provide a valid CSV file' },
        { status: 400 }
      )
    }

    const csvContent = await file.text()
    const lines = csvContent.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        {
          error: 'CSV file must contain at least a header row and one data row',
        },
        { status: 400 }
      )
    }

    // Parse CSV with proper quote handling
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }

      result.push(current.trim())
      return result
    }

    const headers = parseCSVLine(lines[0]).map((h) =>
      h.replace(/"/g, '').trim()
    )
    const dataRows = lines.slice(1)

    const results = {
      success: 0,
      errors: [] as Array<{ row: number; error: string }>,
    }

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const rowIndex = i + 2 // +2 because we skip header and array is 0-indexed

      try {
        const values = parseCSVLine(dataRows[i]).map((v) =>
          v.replace(/"/g, '').trim()
        )
        const row: Partial<CSVRow> = {}

        // Map values to headers
        headers.forEach((header, index) => {
          if (values[index]) {
            row[header as keyof CSVRow] = values[index]
          }
        })

        // Validate required fields
        if (!row.title) {
          results.errors.push({ row: rowIndex, error: 'Title is required' })
          continue
        }

        if (!row.price || isNaN(parseFloat(row.price))) {
          results.errors.push({
            row: rowIndex,
            error: 'Valid price is required',
          })
          continue
        }

        // Generate handle if not provided
        const handle = row.handle || generateHandle(row.title)

        // Check if handle already exists
        const existingProduct = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.handle, handle))
          .limit(1)

        if (existingProduct.length > 0) {
          results.errors.push({
            row: rowIndex,
            error: `Product with handle "${handle}" already exists`,
          })
          continue
        }

        // Prepare product data
        const productId = createId()
        const price = Math.round(parseFloat(row.price) * 100) // Convert to minor units
        const compareAtPrice = row.compare_at_price
          ? Math.round(parseFloat(row.compare_at_price) * 100)
          : null

        const tags = row.tags
          ? row.tags.split(',').map((tag) => tag.trim())
          : []

        const trackInventory =
          row.track_inventory?.toLowerCase() === 'true' ||
          row.track_inventory === '1'
        const status = row.status || 'draft'

        // Validate status
        if (!['draft', 'active', 'archived'].includes(status)) {
          results.errors.push({
            row: rowIndex,
            error: 'Status must be draft, active, or archived',
          })
          continue
        }

        // Create product
        await db.insert(products).values({
          id: productId,
          title: row.title,
          handle,
          description: row.description || null,
          price,
          compareAtPrice,
          vendor: row.vendor || null,
          productType: row.product_type || null,
          tags,
          trackInventory,
          status: status as 'draft' | 'active' | 'archived',
        })

        // Create default variant
        const quantity = row.quantity ? parseInt(row.quantity) : 0
        const sku = row.sku || handle.toUpperCase()

        await db.insert(productVariants).values({
          id: createId(),
          productId,
          title: 'Default',
          price,
          sku,
          inventoryQuantity: quantity,
        })

        results.success++
      } catch (error) {
        console.error(`Error processing row ${rowIndex}:`, error)
        results.errors.push({
          row: rowIndex,
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        })
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
