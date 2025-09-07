'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Package, Info, MessageSquare, Truck } from 'lucide-react'

interface ProductTabsProps {
  product: any
}

export function ProductTabs({ product }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState('description')

  const tabs = [
    { id: 'description', label: 'Description', icon: Info },
    { id: 'specifications', label: 'Specifications', icon: Package },
    { id: 'shipping', label: 'Shipping & Returns', icon: Truck },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare },
  ]

  return (
    <div className="border-t">
      {/* Tab Navigation */}
      <div className="border-b">
        <div className="flex space-x-8 px-6 lg:px-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-black text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 lg:p-8">
        {activeTab === 'description' && (
          <div className="prose prose-gray max-w-none">
            <h3 className="text-lg font-semibold mb-4">Product Description</h3>
            {product.description ? (
              <div className="text-gray-600 space-y-4">
                {product.description.split('\n').map((paragraph: string, index: number) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No description available for this product.</p>
            )}
            
            {/* Additional product details */}
            {product.vendor && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-2">Product Details</h4>
                <dl className="space-y-2">
                  <div className="flex">
                    <dt className="text-gray-500 w-32">Brand:</dt>
                    <dd className="text-gray-900">{product.vendor}</dd>
                  </div>
                  {product.productType && (
                    <div className="flex">
                      <dt className="text-gray-500 w-32">Type:</dt>
                      <dd className="text-gray-900">{product.productType}</dd>
                    </div>
                  )}
                  {product.sku && (
                    <div className="flex">
                      <dt className="text-gray-500 w-32">SKU:</dt>
                      <dd className="text-gray-900">{product.sku}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </div>
        )}

        {activeTab === 'specifications' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Product Specifications</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <dl className="space-y-3">
                {product.vendor && (
                  <div className="flex py-2 border-b border-gray-200">
                    <dt className="text-gray-600 w-1/3">Brand</dt>
                    <dd className="text-gray-900 font-medium">{product.vendor}</dd>
                  </div>
                )}
                {product.productType && (
                  <div className="flex py-2 border-b border-gray-200">
                    <dt className="text-gray-600 w-1/3">Product Type</dt>
                    <dd className="text-gray-900 font-medium">{product.productType}</dd>
                  </div>
                )}
                <div className="flex py-2 border-b border-gray-200">
                  <dt className="text-gray-600 w-1/3">Availability</dt>
                  <dd className="text-gray-900 font-medium">
                    {product.variants?.some((v: any) => v.inventoryQuantity > 0) 
                      ? 'In Stock' 
                      : 'Out of Stock'}
                  </dd>
                </div>
                {product.variants?.length > 0 && (
                  <div className="flex py-2 border-b border-gray-200">
                    <dt className="text-gray-600 w-1/3">Available Options</dt>
                    <dd className="text-gray-900 font-medium">{product.variants.length} variants</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'shipping' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4">Shipping & Returns</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Shipping Information</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>• Free shipping on orders over ₹999</li>
                  <li>• Standard delivery: 3-5 business days</li>
                  <li>• Express delivery: 1-2 business days (additional charges apply)</li>
                  <li>• International shipping available to select countries</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Return Policy</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>• 30-day return window from delivery date</li>
                  <li>• Items must be unused and in original packaging</li>
                  <li>• Free returns on defective items</li>
                  <li>• Refund processed within 5-7 business days after inspection</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Some items may have different shipping times or return policies. 
                  Please check the specific product details or contact customer service for more information.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Customer Reviews</h3>
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No reviews yet</p>
              <p className="text-sm text-gray-400 mt-1">Be the first to review this product</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}