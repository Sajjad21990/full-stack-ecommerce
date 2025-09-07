'use client'

import { useState, useEffect } from 'react'
import { Check, X, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface CollectionSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
}

export default function CollectionSelector({ value, onChange }: CollectionSelectorProps) {
  const [search, setSearch] = useState('')
  const [collections, setCollections] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // TODO: Fetch collections from API
    setCollections([
      { id: '1', title: 'Summer Collection', handle: 'summer' },
      { id: '2', title: 'Winter Collection', handle: 'winter' },
      { id: '3', title: 'New Arrivals', handle: 'new-arrivals' },
    ])
  }, [])

  const filteredCollections = collections.filter(collection =>
    collection.title.toLowerCase().includes(search.toLowerCase())
  )

  const toggleCollection = (collectionId: string) => {
    if (value.includes(collectionId)) {
      onChange(value.filter(id => id !== collectionId))
    } else {
      onChange([...value, collectionId])
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search collections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map(collectionId => {
            const collection = collections.find(c => c.id === collectionId)
            if (!collection) return null
            return (
              <Badge key={collectionId} variant="secondary">
                {collection.title}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-2"
                  onClick={() => toggleCollection(collectionId)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )
          })}
        </div>
      )}

      <ScrollArea className="h-48 border rounded-md p-2">
        <div className="space-y-1">
          {filteredCollections.map(collection => (
            <div
              key={collection.id}
              className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer"
              onClick={() => toggleCollection(collection.id)}
            >
              <span className="text-sm">{collection.title}</span>
              {value.includes(collection.id) && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}