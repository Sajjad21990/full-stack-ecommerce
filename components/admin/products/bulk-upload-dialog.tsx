'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface BulkUploadDialogProps {
  onUploadComplete?: () => void
}

export function BulkUploadDialog({ onUploadComplete }: BulkUploadDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'processing' | 'complete'
  >('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [results, setResults] = useState<{
    success: number
    errors: Array<{ row: number; error: string }>
  }>({ success: 0, errors: [] })
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const downloadSampleCsv = () => {
    const csvContent = `title,handle,description,price,compare_at_price,vendor,product_type,tags,track_inventory,sku,quantity,status
"iPhone 15 Pro","iphone-15-pro","Latest iPhone with advanced features",999,1099,"Apple","smartphone","phone,iphone,smartphone",true,"IPH-15-PRO",50,"active"
"MacBook Air M2","macbook-air-m2","Powerful and lightweight laptop",1199,1299,"Apple","laptop","laptop,macbook,computer",true,"MBA-M2",25,"active"
"AirPods Pro 3","airpods-pro-3","Wireless earbuds with noise cancellation",249,279,"Apple","audio","earbuds,audio,wireless",true,"APP-3",100,"draft"`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'products-sample.csv'
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
    toast.success('Sample CSV downloaded successfully')
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      toast.success('CSV file loaded successfully')
    } else {
      toast.error('Please upload a valid CSV file')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  })

  const processCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file first')
      return
    }

    setUploadStatus('processing')
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', csvFile)

    try {
      const response = await fetch('/api/admin/products/bulk-upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const result = await response.json()

      setResults(result)
      setUploadStatus('complete')
      setUploadProgress(100)

      if (result.success > 0) {
        toast.success(`${result.success} products imported successfully`)
        onUploadComplete?.()
        // Refresh the page to show new products
        setTimeout(() => window.location.reload(), 1000)
      }

      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} products failed to import`)
      }
    } catch (error) {
      toast.error('Failed to process CSV file')
      setUploadStatus('idle')
    }
  }

  const resetUpload = () => {
    setCsvFile(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    setResults({ success: 0, errors: [] })
  }

  const closeDialog = () => {
    setIsOpen(false)
    setTimeout(resetUpload, 300) // Reset after dialog animation
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Product Upload</DialogTitle>
          <DialogDescription>
            Import multiple products from a CSV file. Download the sample CSV to
            see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sample CSV Download */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                CSV Format
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your CSV file should include these columns:
              </p>
              <div className="flex flex-wrap gap-1">
                {[
                  'title',
                  'handle',
                  'description',
                  'price',
                  'compare_at_price',
                  'vendor',
                  'product_type',
                  'tags',
                  'track_inventory',
                  'sku',
                  'quantity',
                  'status',
                ].map((column) => (
                  <Badge key={column} variant="outline" className="text-xs">
                    {column}
                  </Badge>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleCsv}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Sample CSV
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          {uploadStatus === 'idle' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Upload CSV File</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                    isDragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  {csvFile ? (
                    <div className="space-y-1">
                      <p className="font-medium text-green-600">
                        File loaded: {csvFile.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(csvFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-medium">
                        {isDragActive
                          ? 'Drop CSV file here'
                          : 'Drag & drop CSV file or click to select'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Only .csv files are supported
                      </p>
                    </div>
                  )}
                </div>

                {csvFile && (
                  <div className="mt-4 flex gap-2">
                    <Button onClick={processCsvUpload} className="flex-1">
                      Process Upload
                    </Button>
                    <Button variant="outline" onClick={resetUpload}>
                      Clear
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Processing */}
          {uploadStatus === 'processing' && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm font-medium">
                      Processing CSV file...
                    </span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {uploadStatus === 'complete' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Upload Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600">
                    {results.success} products imported successfully
                  </span>
                  <span className="text-red-600">
                    {results.errors.length} errors
                  </span>
                </div>

                {results.errors.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-medium">Errors encountered:</p>
                        <div className="max-h-32 space-y-1 overflow-y-auto">
                          {results.errors.slice(0, 5).map((error, index) => (
                            <p key={index} className="text-xs">
                              Row {error.row}: {error.error}
                            </p>
                          ))}
                          {results.errors.length > 5 && (
                            <p className="text-xs text-muted-foreground">
                              ... and {results.errors.length - 5} more errors
                            </p>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={closeDialog} className="flex-1">
                    Close
                  </Button>
                  <Button variant="outline" onClick={resetUpload}>
                    Upload Another File
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
