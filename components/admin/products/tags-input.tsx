'use client'

import { useState, useEffect } from 'react'
import { X, Tag, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getAllTags } from '@/lib/admin/actions/tags'

interface TagsInputProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}

export function TagsInput({ selectedTags, onTagsChange }: TagsInputProps) {
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [filteredTags, setFilteredTags] = useState<string[]>([])

  useEffect(() => {
    // Load existing tags
    getAllTags().then(setExistingTags)
  }, [])

  useEffect(() => {
    // Filter tags based on what's already selected
    setFilteredTags(existingTags.filter(tag => !selectedTags.includes(tag)))
  }, [existingTags, selectedTags])

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onTagsChange([...selectedTags, trimmedTag])
    }
    setNewTagInput('')
    setIsPopoverOpen(false)
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(newTagInput)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Tags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new tag section */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add a new tag"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => addTag(newTagInput)}
              disabled={!newTagInput.trim()}
            >
              Add
            </Button>
          </div>

          {/* Existing tags dropdown */}
          {filteredTags.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Or select from existing tags:
              </p>
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isPopoverOpen}
                    className="w-full justify-between"
                  >
                    Select existing tag...
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search tags..." />
                    <CommandEmpty>No tag found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-y-auto">
                      {filteredTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => addTag(tag)}
                          className="cursor-pointer"
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedTags.includes(tag) ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Display selected tags */}
        {selectedTags.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Selected tags:</p>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}