'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, X, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/storefront/utils'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      // Load recent searches from localStorage
      const recent = localStorage.getItem('recentSearches')
      if (recent) {
        setRecentSearches(JSON.parse(recent))
      }
    } else {
      setQuery('')
      setSuggestions([])
      setSelectedIndex(-1)
    }
  }, [isOpen])

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true)
        try {
          const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`)
          const data = await response.json()
          setSuggestions(data.suggestions || [])
          setSelectedIndex(-1)
        } catch (error) {
          console.error('Search suggestions error:', error)
          setSuggestions([])
        } finally {
          setLoading(false)
        }
      } else {
        setSuggestions([])
        setSelectedIndex(-1)
      }
    }, 200)

    return () => clearTimeout(delayDebounce)
  }, [query])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && suggestions[selectedIndex]) {
            const suggestion = suggestions[selectedIndex]
            if (suggestion.type === 'product') {
              router.push(suggestion.url)
            } else {
              router.push(suggestion.url)
            }
            onClose()
          } else {
            handleSearch(e as any)
          }
          break
        case 'Escape':
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, suggestions, router])

  const handleSuggestionClick = (suggestion: any) => {
    // Save to recent searches if it's a search term
    if (suggestion.type !== 'product') {
      const searchTerm = suggestion.title
      const updatedRecent = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5)
      setRecentSearches(updatedRecent)
      localStorage.setItem('recentSearches', JSON.stringify(updatedRecent))
    }
    
    router.push(suggestion.url)
    onClose()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      // Save to recent searches
      const updatedRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
      setRecentSearches(updatedRecent)
      localStorage.setItem('recentSearches', JSON.stringify(updatedRecent))
      
      router.push(`/search?q=${encodeURIComponent(query)}`)
      onClose()
    }
  }

  const handleRecentSearch = (search: string) => {
    setQuery(search)
    router.push(`/search?q=${encodeURIComponent(search)}`)
    onClose()
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('recentSearches')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0">
        <div className="p-6">
          {/* Search Input */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search for products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-12 h-12 text-lg"
            />
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          </form>

          {/* Search Suggestions */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full mx-auto"></div>
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Suggestions</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full flex items-center gap-4 p-3 text-left rounded-lg transition-colors ${
                      selectedIndex === index 
                        ? 'bg-gray-100' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {suggestion.type === 'product' ? (
                      suggestion.image ? (
                        <Image
                          src={suggestion.image}
                          alt={suggestion.title}
                          width={48}
                          height={48}
                          className="rounded-md object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-md flex-shrink-0" />
                      )
                    ) : (
                      <div className={`w-12 h-12 rounded-md flex-shrink-0 flex items-center justify-center text-white text-sm font-medium ${
                        suggestion.type === 'category' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}>
                        {suggestion.type === 'category' ? 'CAT' : 'BND'}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {suggestion.title}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {suggestion.type === 'product' && suggestion.price 
                          ? formatPrice(suggestion.price)
                          : suggestion.subtitle
                        }
                      </p>
                    </div>

                    {suggestion.type !== 'product' && (
                      <div className="flex-shrink-0 text-xs text-gray-400">
                        {suggestion.type === 'category' ? 'Category' : 'Brand'}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleSearch}
                className="w-full mt-4 text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Search for "{query}"
              </button>
            </div>
          )}

          {/* Recent Searches */}
          {!loading && query.length === 0 && recentSearches.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Searches
                </h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearch(search)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          {!loading && query.length === 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4" />
                Trending Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Summer Sale', 'New Arrivals', 'Sneakers', 'Dresses', 'Accessories'].map((trend) => (
                  <button
                    key={trend}
                    onClick={() => setQuery(trend)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    {trend}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {!loading && query.length > 1 && suggestions.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No suggestions found for "{query}"</p>
              <p className="text-sm text-gray-400 mt-1">Try searching with different keywords</p>
              <button
                onClick={handleSearch}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Search anyway
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}