'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import {
  Upload,
  X,
  Image as ImageIcon,
  Film,
  FileText,
  File,
  Plus,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { uploadMedia } from '@/lib/admin/actions/media'
import { formatFileSize } from '@/lib/utils'
import { toast } from 'sonner'

interface UploadFile extends File {
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  preview?: string
  folder?: string
  tags?: string[]
  altText?: string
  title?: string
  description?: string
}

interface MediaUploadProps {
  folders?: string[]
  onUploadComplete?: () => void
  maxFiles?: number
  acceptedTypes?: string[]
}

export function MediaUpload({
  folders = [],
  onUploadComplete,
  maxFiles = 10,
  acceptedTypes = ['image/*', 'video/*', 'application/pdf'],
}: MediaUploadProps) {
  const router = useRouter()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [defaultFolder, setDefaultFolder] = useState<string>('')
  const [defaultTags, setDefaultTags] = useState<string>('')

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      rejectedFiles.forEach((rejection) => {
        const { file, errors } = rejection
        errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            toast.error(`File ${file.name} is too large (max 10MB)`)
          } else if (error.code === 'file-invalid-type') {
            toast.error(`File type not allowed: ${file.name}`)
          }
        })
      })

      // Add accepted files
      const newFiles = acceptedFiles.map((file) => {
        const uploadFile: UploadFile = {
          ...file,
          id: `${file.name}-${Date.now()}`,
          progress: 0,
          status: 'pending',
          folder:
            defaultFolder && defaultFolder !== '__root__'
              ? defaultFolder
              : undefined,
          tags: defaultTags
            ? defaultTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
            : undefined,
        }

        // Create preview for images
        if (file.type.startsWith('image/')) {
          uploadFile.preview = URL.createObjectURL(file)
        }

        return uploadFile
      })

      setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles))
    },
    [defaultFolder, defaultTags, maxFiles]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
    maxFiles,
  })

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  const updateFileMetadata = (id: string, updates: Partial<UploadFile>) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, ...updates } : file))
    )
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (file.status !== 'pending') continue

      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: 'uploading' as const, progress: 0 }
              : f
          )
        )

        // Create FormData
        const formData = new FormData()
        formData.append('file', file)
        if (file.folder && file.folder !== '__root__')
          formData.append('folder', file.folder)
        if (file.tags?.length) formData.append('tags', file.tags.join(','))
        if (file.altText) formData.append('altText', file.altText)
        if (file.title) formData.append('title', file.title)
        if (file.description) formData.append('description', file.description)

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id && f.progress < 90
                ? { ...f, progress: f.progress + 10 }
                : f
            )
          )
        }, 200)

        const result = await uploadMedia(formData)

        clearInterval(progressInterval)

        if (result.success) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? { ...f, status: 'success' as const, progress: 100 }
                : f
            )
          )
          toast.success(`Uploaded ${file.name}`)
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? { ...f, status: 'error' as const, progress: 0 }
                : f
            )
          )
          toast.error(result.error || `Failed to upload ${file.name}`)
        }
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: 'error' as const, progress: 0 }
              : f
          )
        )
        toast.error(`Error uploading ${file.name}`)
      }
    }

    setUploading(false)
    onUploadComplete?.()

    // Clean up successful uploads after a delay
    setTimeout(() => {
      setFiles((prev) => prev.filter((f) => f.status !== 'success'))
    }, 2000)
  }

  const getFileIcon = (type: string) => {
    if (type && type.startsWith('image/')) return ImageIcon
    if (type && type.startsWith('video/')) return Film
    if (type === 'application/pdf') return FileText
    return File
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'uploading':
        return 'bg-blue-500'
      default:
        return 'bg-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Settings</CardTitle>
          <CardDescription>
            Set default folder and tags for all uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default-folder">Default Folder</Label>
            <Select value={defaultFolder} onValueChange={setDefaultFolder}>
              <SelectTrigger>
                <SelectValue placeholder="Select folder (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">No folder (root)</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder} value={folder}>
                    {folder}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="default-tags">Default Tags</Label>
            <Input
              id="default-tags"
              value={defaultTags}
              onChange={(e) => setDefaultTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            } `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop files here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium">
                  Drag & drop files here, or click to browse
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Supports images, videos, and PDFs up to 10MB each
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Files to Upload ({files.length})</CardTitle>
              <Button
                onClick={uploadFiles}
                disabled={
                  uploading || files.every((f) => f.status !== 'pending')
                }
              >
                {uploading ? 'Uploading...' : 'Upload All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((file) => {
                const Icon = getFileIcon(file.type)

                return (
                  <div key={file.id} className="rounded-lg border p-4">
                    <div className="flex items-start gap-4">
                      {/* Preview/Icon */}
                      <div className="flex-shrink-0">
                        {file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="h-16 w-16 rounded object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                            <Icon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(file.size)} • {file.type}
                            </p>
                            {file.tags && file.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {file.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeFile(file.id)}
                            disabled={uploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Progress */}
                        {file.status === 'uploading' && (
                          <div className="mt-2">
                            <Progress value={file.progress} className="h-2" />
                          </div>
                        )}

                        {/* Status */}
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${getStatusColor(file.status)}`}
                          />
                          <span className="text-sm capitalize">
                            {file.status}
                          </span>
                        </div>

                        {/* Metadata Inputs */}
                        {file.status === 'pending' && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <Input
                              placeholder="Alt text"
                              value={file.altText || ''}
                              onChange={(e) =>
                                updateFileMetadata(file.id, {
                                  altText: e.target.value,
                                })
                              }
                              disabled={uploading}
                            />
                            <Input
                              placeholder="Title"
                              value={file.title || ''}
                              onChange={(e) =>
                                updateFileMetadata(file.id, {
                                  title: e.target.value,
                                })
                              }
                              disabled={uploading}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
