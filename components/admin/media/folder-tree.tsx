'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Folder,
  FolderOpen,
  FolderPlus,
  MoreHorizontal,
  Edit,
  Move,
  Trash2,
  ChevronDown,
  ChevronRight,
  File,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  deleteMediaFolder,
  renameMediaFolder,
} from '@/lib/admin/actions/folders'

interface FolderNode {
  id: string
  name: string
  path: string
  parentId: string | null
  depth: string
  children: FolderNode[]
  totalFiles: number
  totalFolders: number
  createdAt: Date
}

interface FolderTreeProps {
  folders: FolderNode[]
  currentFolder?: string
  onFolderSelect: (folderPath: string) => void
  onCreateFolder: (parentId?: string) => void
}

interface FolderItemProps {
  folder: FolderNode
  currentFolder?: string
  onFolderSelect: (folderPath: string) => void
  onCreateFolder: (parentId?: string) => void
  level: number
}

function FolderItem({
  folder,
  currentFolder,
  onFolderSelect,
  onCreateFolder,
  level,
}: FolderItemProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(level < 2)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [newName, setNewName] = useState(folder.name)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const hasChildren = folder.children.length > 0
  const isSelected = currentFolder === folder.path
  const indent = level * 20

  const handleRename = async () => {
    if (!newName.trim()) return

    setIsRenaming(true)
    try {
      const result = await renameMediaFolder(folder.id, newName.trim())

      if (result.success) {
        toast.success('Folder renamed successfully')
        setShowRenameDialog(false)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to rename folder')
      }
    } catch (error) {
      toast.error('Failed to rename folder')
    } finally {
      setIsRenaming(false)
    }
  }

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${folder.name}" and all its contents? This action cannot be undone.`
      )
    ) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteMediaFolder(folder.id)

      if (result.success) {
        toast.success(result.message || 'Folder deleted successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete folder')
      }
    } catch (error) {
      toast.error('Failed to delete folder')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div
        className={`group flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 ${
          isSelected ? 'bg-muted' : ''
        }`}
        style={{ marginLeft: `${indent}px` }}
      >
        {/* Expand/Collapse */}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setIsExpanded(!isExpanded)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : null}
        </Button>

        {/* Folder Icon */}
        <div
          onClick={() => onFolderSelect(folder.path)}
          className="flex flex-1 items-center gap-2"
        >
          {isExpanded && hasChildren ? (
            <FolderOpen className="h-4 w-4 text-blue-500" />
          ) : (
            <Folder className="h-4 w-4 text-blue-500" />
          )}

          {/* Folder Name */}
          <span className="truncate text-sm font-medium">{folder.name}</span>

          {/* File/Folder Count */}
          <div className="flex items-center gap-1">
            {folder.totalFiles > 0 && (
              <Badge variant="secondary" className="px-1 text-xs">
                <File className="mr-1 h-2 w-2" />
                {folder.totalFiles}
              </Badge>
            )}
            {folder.totalFolders > 0 && (
              <Badge variant="outline" className="px-1 text-xs">
                <Folder className="mr-1 h-2 w-2" />
                {folder.totalFolders}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              currentFolder={currentFolder}
              onFolderSelect={onFolderSelect}
              onCreateFolder={onCreateFolder}
              level={level + 1}
            />
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for the folder &quot;{folder.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter folder name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleRename()
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRenameDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={isRenaming || !newName.trim()}
            >
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function FolderTree({
  folders,
  currentFolder,
  onFolderSelect,
  onCreateFolder,
}: FolderTreeProps) {
  return (
    <div className="space-y-1">
      {/* Root Level */}
      <div
        className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/50 ${
          currentFolder === '' || !currentFolder ? 'bg-muted' : ''
        }`}
        onClick={() => onFolderSelect('')}
      >
        <div className="w-6" /> {/* Spacer for alignment */}
        <Folder className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">All Files</span>
      </div>

      {/* Folder Tree */}
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          currentFolder={currentFolder}
          onFolderSelect={onFolderSelect}
          onCreateFolder={onCreateFolder}
          level={0}
        />
      ))}

      {/* Empty State */}
      {folders.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <Folder className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No folders created yet</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => onCreateFolder()}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Create First Folder
          </Button>
        </div>
      )}
    </div>
  )
}
