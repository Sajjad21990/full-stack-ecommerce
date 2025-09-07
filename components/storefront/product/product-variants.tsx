'use client'

import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/storefront/utils'
import { Check, AlertCircle } from 'lucide-react'

interface ProductOption {
  id: string
  name: string
  position: number
  values: Array<{
    id: string
    value: string
    position: number
  }>
}

interface ProductVariant {
  id: string
  title: string
  sku?: string
  price: number
  compareAtPrice?: number
  inventoryQuantity: number
  option1?: string
  option2?: string
  option3?: string
}

interface ProductVariantsProps {
  options: ProductOption[]
  variants: ProductVariant[]
  onVariantChange: (variant: ProductVariant | null) => void
  initialVariant?: ProductVariant
}

export function ProductVariants({ 
  options, 
  variants, 
  onVariantChange,
  initialVariant 
}: ProductVariantsProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  // Initialize with first variant or provided initial variant
  useEffect(() => {
    if (initialVariant) {
      const initialOptions: Record<string, string> = {}
      if (initialVariant.option1) initialOptions[options[0]?.name] = initialVariant.option1
      if (initialVariant.option2) initialOptions[options[1]?.name] = initialVariant.option2
      if (initialVariant.option3) initialOptions[options[2]?.name] = initialVariant.option3
      setSelectedOptions(initialOptions)
    } else if (variants.length > 0) {
      const firstVariant = variants[0]
      const initialOptions: Record<string, string> = {}
      if (firstVariant.option1) initialOptions[options[0]?.name] = firstVariant.option1
      if (firstVariant.option2) initialOptions[options[1]?.name] = firstVariant.option2
      if (firstVariant.option3) initialOptions[options[2]?.name] = firstVariant.option3
      setSelectedOptions(initialOptions)
    }
  }, [options, variants, initialVariant])

  // Find the currently selected variant
  const selectedVariant = useMemo(() => {
    if (!variants || variants.length === 0) return null
    
    return variants.find(variant => {
      const matches = []
      if (options[0]?.name && selectedOptions[options[0].name]) {
        matches.push(variant.option1 === selectedOptions[options[0].name])
      }
      if (options[1]?.name && selectedOptions[options[1].name]) {
        matches.push(variant.option2 === selectedOptions[options[1].name])
      }
      if (options[2]?.name && selectedOptions[options[2].name]) {
        matches.push(variant.option3 === selectedOptions[options[2].name])
      }
      
      return matches.length > 0 && matches.every(match => match)
    }) || null
  }, [selectedOptions, variants, options])

  // Update parent component when variant changes
  useEffect(() => {
    onVariantChange(selectedVariant)
  }, [selectedVariant, onVariantChange])

  // Get available values for a specific option
  const getAvailableValues = (optionName: string, optionIndex: number) => {
    if (!options[optionIndex]) return []

    return options[optionIndex].values.filter(valueItem => {
      // Create a test selection with this value
      const testOptions = { ...selectedOptions, [optionName]: valueItem.value }
      
      // Check if any variant matches this combination
      return variants.some(variant => {
        const matches = []
        if (options[0]?.name) {
          const value = optionIndex === 0 ? valueItem.value : selectedOptions[options[0].name]
          if (value) matches.push(variant.option1 === value)
        }
        if (options[1]?.name) {
          const value = optionIndex === 1 ? valueItem.value : selectedOptions[options[1].name]
          if (value) matches.push(variant.option2 === value)
        }
        if (options[2]?.name) {
          const value = optionIndex === 2 ? valueItem.value : selectedOptions[options[2].name]
          if (value) matches.push(variant.option3 === value)
        }
        
        return matches.length === Object.keys(testOptions).length && matches.every(match => match)
      })
    })
  }

  // Get variants that would be available for a specific option value
  const getVariantsForValue = (optionName: string, value: string, optionIndex: number) => {
    const testOptions = { ...selectedOptions, [optionName]: value }
    
    return variants.filter(variant => {
      const matches = []
      if (options[0]?.name && testOptions[options[0].name]) {
        matches.push(variant.option1 === testOptions[options[0].name])
      }
      if (options[1]?.name && testOptions[options[1].name]) {
        matches.push(variant.option2 === testOptions[options[1].name])
      }
      if (options[2]?.name && testOptions[options[2].name]) {
        matches.push(variant.option3 === testOptions[options[2].name])
      }
      
      return matches.length > 0 && matches.every(match => match)
    })
  }

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }))
  }

  // If no options, don't render anything
  if (!options || options.length === 0) return null

  // Sort options by position
  const sortedOptions = [...options].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-6">
      {sortedOptions.map((option, optionIndex) => {
        const availableValues = getAvailableValues(option.name, optionIndex)
        const selectedValue = selectedOptions[option.name]
        
        return (
          <div key={option.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                {option.name}
                {selectedValue && (
                  <span className="ml-2 text-gray-600">: {selectedValue}</span>
                )}
              </h3>
              {availableValues.length === 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>Limited availability</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {option.values
                .sort((a, b) => a.position - b.position)
                .map(valueItem => {
                  const isSelected = selectedValue === valueItem.value
                  const isAvailable = availableValues.some(av => av.value === valueItem.value)
                  const variantsForValue = getVariantsForValue(option.name, valueItem.value, optionIndex)
                  const hasStock = variantsForValue.some(v => v.inventoryQuantity > 0)
                  const lowestPrice = Math.min(...variantsForValue.map(v => v.price))
                  const showPrice = variantsForValue.length > 0 && option.name.toLowerCase() !== 'color'

                  return (
                    <button
                      key={valueItem.id}
                      onClick={() => isAvailable && hasStock && handleOptionSelect(option.name, valueItem.value)}
                      disabled={!isAvailable || !hasStock}
                      className={cn(
                        "relative px-3 py-2 border rounded-lg text-sm font-medium transition-all text-left",
                        "focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1",
                        isSelected
                          ? "border-black bg-black text-white shadow-md"
                          : isAvailable && hasStock
                          ? "border-gray-300 hover:border-gray-500 hover:shadow-sm"
                          : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "truncate",
                          !isAvailable || !hasStock ? "line-through" : ""
                        )}>
                          {valueItem.value}
                        </span>
                        {isSelected && (
                          <Check className="h-3 w-3 flex-shrink-0 ml-1" />
                        )}
                      </div>
                      
                      {showPrice && variantsForValue.length > 0 && (
                        <div className="text-xs mt-1 opacity-75">
                          {formatPrice(lowestPrice)}
                        </div>
                      )}
                      
                      {!hasStock && isAvailable && (
                        <div className="text-xs mt-1 text-red-500">
                          Out of stock
                        </div>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>
        )
      })}
      
      {/* Selected Variant Summary */}
      {selectedVariant && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Selected Variant</h4>
              <p className="text-sm text-gray-600 mt-1">{selectedVariant.title}</p>
              {selectedVariant.sku && (
                <p className="text-xs text-gray-500 mt-1">SKU: {selectedVariant.sku}</p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-gray-900">
                  {formatPrice(selectedVariant.price)}
                </span>
                {selectedVariant.compareAtPrice && selectedVariant.compareAtPrice > selectedVariant.price && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(selectedVariant.compareAtPrice)}
                  </span>
                )}
              </div>
              <div className="text-sm mt-1">
                {selectedVariant.inventoryQuantity > 0 ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {selectedVariant.inventoryQuantity > 10 
                      ? "In stock" 
                      : `${selectedVariant.inventoryQuantity} remaining`
                    }
                  </span>
                ) : (
                  <span className="text-red-600">Out of stock</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}