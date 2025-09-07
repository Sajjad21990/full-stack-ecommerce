'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Download, Package, Users, Loader2, FileText, Database } from 'lucide-react'
import { exportProducts, exportUsers } from '@/lib/admin/actions/export-import'

export function ExportSection() {
  const [isPending, startTransition] = useTransition()
  const [exportType, setExportType] = useState<'products' | 'users'>('products')
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [options, setOptions] = useState({
    includeVariants: true,
    includeCollections: false,
    includeCategories: false
  })

  const handleExport = () => {
    startTransition(async () => {
      try {
        let result
        
        if (exportType === 'products') {
          result = await exportProducts({
            format,
            includeVariants: options.includeVariants,
            includeCollections: options.includeCollections,
            includeCategories: options.includeCategories
          })
        } else {
          result = await exportUsers()
        }

        if (result.success) {
          // Create and download file
          const blob = new Blob([result.data], { type: result.contentType })
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = result.filename
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          
          toast.success(`${exportType} exported successfully`)
        } else {
          toast.error(result.error || 'Export failed')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
        console.error('Export error:', error)
      }
    })
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Products Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Export Products
          </CardTitle>
          <CardDescription>
            Download all products with variants, collections, and categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={(value: 'csv' | 'json') => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                <SelectItem value="json">JSON (Structured Data)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Include Additional Data</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="variants"
                checked={options.includeVariants}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeVariants: checked as boolean })
                }
              />
              <Label htmlFor="variants" className="text-sm">
                Product Variants
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="collections"
                checked={options.includeCollections}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeCollections: checked as boolean })
                }
              />
              <Label htmlFor="collections" className="text-sm">
                Collections
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="categories"
                checked={options.includeCategories}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, includeCategories: checked as boolean })
                }
              />
              <Label htmlFor="categories" className="text-sm">
                Categories
              </Label>
            </div>
          </div>

          <Button
            onClick={() => {
              setExportType('products')
              handleExport()
            }}
            disabled={isPending}
            className="w-full"
          >
            {isPending && exportType === 'products' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Products
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Users Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Export Users
          </CardTitle>
          <CardDescription>
            Download user accounts and profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-2">Includes:</p>
            <ul className="space-y-1 text-xs">
              <li>• User profiles and contact information</li>
              <li>• Account status and roles</li>
              <li>• Registration and last login dates</li>
              <li>• Email verification status</li>
            </ul>
            <p className="mt-2 font-medium text-amber-600">
              Note: Passwords are not included for security
            </p>
          </div>

          <Button
            onClick={() => {
              setExportType('users')
              handleExport()
            }}
            disabled={isPending}
            className="w-full"
          >
            {isPending && exportType === 'users' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Users (JSON)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Quick Export Actions
          </CardTitle>
          <CardDescription>
            Common export scenarios for backup and analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button
              variant="outline"
              onClick={() => {
                setExportType('products')
                setFormat('csv')
                setOptions({ includeVariants: true, includeCollections: false, includeCategories: false })
                handleExport()
              }}
              disabled={isPending}
              className="justify-start"
            >
              <FileText className="mr-2 h-4 w-4" />
              Products + Variants (CSV)
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setExportType('products')
                setFormat('json')
                setOptions({ includeVariants: true, includeCollections: true, includeCategories: true })
                handleExport()
              }}
              disabled={isPending}
              className="justify-start"
            >
              <Database className="mr-2 h-4 w-4" />
              Full Catalog (JSON)
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setExportType('users')
                handleExport()
              }}
              disabled={isPending}
              className="justify-start"
            >
              <Users className="mr-2 h-4 w-4" />
              User Directory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}