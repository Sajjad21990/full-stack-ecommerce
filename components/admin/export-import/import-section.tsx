'use client'

import { useState, useTransition, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Upload, Package, Users, Loader2, FileText, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { importProducts, importUsers } from '@/lib/admin/actions/export-import'

interface ImportResult {
  success: boolean
  results?: {
    created: number
    updated: number
    errors: number
    errorMessages: string[]
  }
  message?: string
  error?: string
}

export function ImportSection() {
  const [isPending, startTransition] = useTransition()
  const [importType, setImportType] = useState<'products' | 'users'>('products')
  const [format, setFormat] = useState<'csv' | 'json'>('json')
  const [fileContent, setFileContent] = useState('')
  const [lastResult, setLastResult] = useState<ImportResult | null>(null)
  const [options, setOptions] = useState({
    updateExisting: false,
    createCollections: false,
    createCategories: false
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setFileContent(content)
      
      // Auto-detect format based on file extension or content
      if (file.name.endsWith('.csv') || content.startsWith('"') || content.includes(',')) {
        setFormat('csv')
      } else {
        setFormat('json')
      }
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!fileContent.trim()) {
      toast.error('Please select a file or paste data')
      return
    }

    startTransition(async () => {
      try {
        let result
        
        if (importType === 'products') {
          result = await importProducts(fileContent, {
            format,
            updateExisting: options.updateExisting,
            createCollections: options.createCollections,
            createCategories: options.createCategories
          })
        } else {
          result = await importUsers(fileContent)
        }

        setLastResult(result)
        
        if (result.success) {
          toast.success(result.message || 'Import completed successfully')
          setFileContent('')
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } else {
          toast.error(result.error || 'Import failed')
        }
      } catch (error) {
        toast.error('An unexpected error occurred')
        console.error('Import error:', error)
        setLastResult({
          success: false,
          error: 'An unexpected error occurred'
        })
      }
    })
  }

  const clearData = () => {
    setFileContent('')
    setLastResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Import Type Selection */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className={importType === 'products' ? 'ring-2 ring-primary' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Import Products
            </CardTitle>
            <CardDescription>
              Upload products with variants and associations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={importType === 'products' ? 'default' : 'outline'}
              onClick={() => setImportType('products')}
              className="w-full"
            >
              Select Products Import
            </Button>
          </CardContent>
        </Card>

        <Card className={importType === 'users' ? 'ring-2 ring-primary' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Import Users
            </CardTitle>
            <CardDescription>
              Upload user accounts and profiles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={importType === 'users' ? 'default' : 'outline'}
              onClick={() => setImportType('users')}
              className="w-full"
            >
              Select Users Import
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Import Configuration</CardTitle>
          <CardDescription>
            Configure how the data should be imported
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Data Format</Label>
            <Select value={format} onValueChange={(value: 'csv' | 'json') => setFormat(value)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (Structured Data)</SelectItem>
                {importType === 'products' && (
                  <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Import Options */}
          {importType === 'products' && (
            <div className="space-y-3">
              <Label>Import Options</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateExisting"
                  checked={options.updateExisting}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, updateExisting: checked as boolean })
                  }
                />
                <Label htmlFor="updateExisting" className="text-sm">
                  Update existing products (match by handle)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createCollections"
                  checked={options.createCollections}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, createCollections: checked as boolean })
                  }
                />
                <Label htmlFor="createCollections" className="text-sm">
                  Create missing collections
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createCategories"
                  checked={options.createCategories}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, createCategories: checked as boolean })
                  }
                />
                <Label htmlFor="createCategories" className="text-sm">
                  Create missing categories
                </Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Input */}
      <Card>
        <CardHeader>
          <CardTitle>Data Input</CardTitle>
          <CardDescription>
            Upload a file or paste your data directly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload File</Label>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={format === 'csv' ? '.csv' : '.json'}
                onChange={handleFileSelect}
                className="flex-1 text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <Button variant="outline" size="sm" onClick={clearData}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <Label>Or Paste Data</Label>
            <Textarea
              placeholder={`Paste your ${format.toUpperCase()} data here...`}
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={isPending || !fileContent.trim()}
            className="w-full"
            size="lg"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing {importType}...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import {importType}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Results */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastResult.success && lastResult.results ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {lastResult.results.created}
                    </div>
                    <div className="text-sm text-green-600">Created</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {lastResult.results.updated}
                    </div>
                    <div className="text-sm text-blue-600">Updated</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {lastResult.results.errors}
                    </div>
                    <div className="text-sm text-red-600">Errors</div>
                  </div>
                </div>

                {lastResult.results.errorMessages.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Import Errors:</div>
                      <ul className="text-sm space-y-1">
                        {lastResult.results.errorMessages.slice(0, 10).map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                        {lastResult.results.errorMessages.length > 10 && (
                          <li>• ... and {lastResult.results.errorMessages.length - 10} more errors</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {lastResult.error || 'Import failed'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Data Format Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Products Import Format</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Required fields: title, handle, price
              </p>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`{
  "products": [
    {
      "title": "Product Name",
      "handle": "product-name",
      "price": 29.99,
      "description": "Product description",
      "status": "active",
      "variants": [
        {
          "title": "Default",
          "price": 29.99,
          "sku": "PRD-001"
        }
      ]
    }
  ]
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">Users Import Format</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Required fields: email, name
              </p>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`[
  {
    "email": "user@example.com",
    "name": "User Name",
    "role": "customer",
    "status": "active"
  }
]`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}