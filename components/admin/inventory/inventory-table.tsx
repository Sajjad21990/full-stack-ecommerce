'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  MoreHorizontal,
  Edit,
  History,
  Plus,
  Minus,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createInventoryAdjustment, updateReorderSettings, setStockQuantity } from '@/lib/admin/actions/inventory'
import { toast } from 'sonner'

interface InventoryTableProps {
  inventory: any[]
  locations: any[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  currentFilters: any
}

export function InventoryTable({ inventory, locations, pagination, currentFilters }: InventoryTableProps) {
  const router = useRouter()
  const [adjustmentDialog, setAdjustmentDialog] = useState<{
    open: boolean
    item: any | null
    type: 'adjustment' | 'reorder' | 'setQuantity'
  }>({
    open: false,
    item: null,
    type: 'adjustment'
  })
  
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'correction',
    quantity: 0,
    newQuantity: 0,
    reason: '',
    notes: '',
    reorderPoint: 0,
    reorderQuantity: 0,
  })
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getStockStatus = (quantity: number, reorderPoint?: number) => {
    if (quantity === 0) {
      return { status: 'out', label: 'Out of Stock', variant: 'destructive' as const }
    } else if (reorderPoint && quantity <= reorderPoint) {
      return { status: 'low', label: 'Low Stock', variant: 'secondary' as const }
    } else {
      return { status: 'good', label: 'In Stock', variant: 'outline' as const }
    }
  }

  const handleOpenAdjustment = (item: any, type: 'adjustment' | 'reorder' | 'setQuantity') => {
    setAdjustmentDialog({ open: true, item, type })
    setAdjustmentForm({
      type: 'correction',
      quantity: 0,
      newQuantity: item.quantity,
      reason: '',
      notes: '',
      reorderPoint: item.reorderPoint || 0,
      reorderQuantity: item.reorderQuantity || 0,
    })
  }

  const handleCloseAdjustment = () => {
    setAdjustmentDialog({ open: false, item: null, type: 'adjustment' })
    setAdjustmentForm({
      type: 'correction',
      quantity: 0,
      newQuantity: 0,
      reason: '',
      notes: '',
      reorderPoint: 0,
      reorderQuantity: 0,
    })
  }

  const handleSubmitAdjustment = async () => {
    if (!adjustmentDialog.item) return
    
    setIsSubmitting(true)
    
    try {
      let result
      
      if (adjustmentDialog.type === 'adjustment') {
        result = await createInventoryAdjustment({
          variantId: adjustmentDialog.item.variantId,
          locationId: adjustmentDialog.item.locationId,
          type: adjustmentForm.type as any,
          quantity: adjustmentForm.quantity,
          reason: adjustmentForm.reason,
          notes: adjustmentForm.notes,
        })
      } else if (adjustmentDialog.type === 'setQuantity') {
        result = await setStockQuantity(
          adjustmentDialog.item.variantId,
          adjustmentDialog.item.locationId,
          adjustmentForm.newQuantity,
          adjustmentForm.reason
        )
      } else if (adjustmentDialog.type === 'reorder') {
        result = await updateReorderSettings({
          variantId: adjustmentDialog.item.variantId,
          locationId: adjustmentDialog.item.locationId,
          reorderPoint: adjustmentForm.reorderPoint,
          reorderQuantity: adjustmentForm.reorderQuantity,
        })
      }
      
      if (result?.success) {
        toast.success(result.message)
        router.refresh()
        handleCloseAdjustment()
      } else {
        toast.error(result?.error || 'Operation failed')
      }
    } catch (error) {
      toast.error('Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (inventory.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No inventory found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Start by creating products and setting up inventory locations.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Reserved</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item.quantity, item.reorderPoint)
                
                return (
                  <TableRow key={`${item.variantId}-${item.locationId}`}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.productTitle}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.variantTitle !== 'Default' && item.variantTitle}
                          {item.variantSku && (
                            <span className="ml-2 font-mono text-xs">
                              SKU: {item.variantSku}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{item.locationName}</div>
                        <div className="text-sm text-muted-foreground">{item.locationCode}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={stockStatus.variant}>
                        {stockStatus.status === 'out' && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {stockStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-lg">{item.quantity}</div>
                        {item.incomingQuantity > 0 && (
                          <div className="text-xs text-muted-foreground">
                            +{item.incomingQuantity} incoming
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.reservedQuantity > 0 ? (
                        <span className="text-orange-600">{item.reservedQuantity}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.reorderPoint ? (
                        <span>{item.reorderPoint}</span>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.lastRestockedAt && (
                          <div className="text-xs text-green-600 flex items-center">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Restocked {new Date(item.lastRestockedAt).toLocaleDateString()}
                          </div>
                        )}
                        {item.lastSoldAt && (
                          <div className="text-xs text-blue-600 flex items-center">
                            <TrendingDown className="mr-1 h-3 w-3" />
                            Sold {new Date(item.lastSoldAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Inventory Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleOpenAdjustment(item, 'setQuantity')}>
                            <Edit className="mr-2 h-4 w-4" />
                            Set Quantity
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenAdjustment(item, 'adjustment')}>
                            <Plus className="mr-2 h-4 w-4" />
                            Adjust Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleOpenAdjustment(item, 'reorder')}>
                            <Settings className="mr-2 h-4 w-4" />
                            Reorder Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <History className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} items
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search)
                  params.set('page', (pagination.page - 1).toString())
                  router.push(`?${params.toString()}`)
                }}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.pages}
                onClick={() => {
                  const params = new URLSearchParams(window.location.search)
                  params.set('page', (pagination.page + 1).toString())
                  router.push(`?${params.toString()}`)
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentDialog.open} onOpenChange={handleCloseAdjustment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {adjustmentDialog.type === 'adjustment' && 'Adjust Stock Level'}
              {adjustmentDialog.type === 'setQuantity' && 'Set Stock Quantity'}
              {adjustmentDialog.type === 'reorder' && 'Update Reorder Settings'}
            </DialogTitle>
            <DialogDescription>
              {adjustmentDialog.item && (
                <span>
                  {adjustmentDialog.item.productTitle} - {adjustmentDialog.item.variantTitle} 
                  at {adjustmentDialog.item.locationName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {adjustmentDialog.type === 'adjustment' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="adjustment-type">Adjustment Type</Label>
                  <Select
                    value={adjustmentForm.type}
                    onValueChange={(value) => setAdjustmentForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="correction">Correction</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Change</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="Enter quantity (positive to add, negative to remove)"
                    value={adjustmentForm.quantity}
                    onChange={(e) => setAdjustmentForm(prev => ({ 
                      ...prev, 
                      quantity: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    placeholder="Reason for adjustment"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes"
                    value={adjustmentForm.notes}
                    onChange={(e) => setAdjustmentForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </>
            )}

            {adjustmentDialog.type === 'setQuantity' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-quantity">New Quantity</Label>
                  <Input
                    id="new-quantity"
                    type="number"
                    min="0"
                    placeholder="Enter new quantity"
                    value={adjustmentForm.newQuantity}
                    onChange={(e) => setAdjustmentForm(prev => ({ 
                      ...prev, 
                      newQuantity: parseInt(e.target.value) || 0 
                    }))}
                  />
                  <p className="text-sm text-muted-foreground">
                    Current quantity: {adjustmentDialog.item?.quantity || 0}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    placeholder="Reason for setting quantity"
                    value={adjustmentForm.reason}
                    onChange={(e) => setAdjustmentForm(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>
              </>
            )}

            {adjustmentDialog.type === 'reorder' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reorder-point">Reorder Point</Label>
                  <Input
                    id="reorder-point"
                    type="number"
                    min="0"
                    placeholder="When to reorder"
                    value={adjustmentForm.reorderPoint}
                    onChange={(e) => setAdjustmentForm(prev => ({ 
                      ...prev, 
                      reorderPoint: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorder-quantity">Reorder Quantity</Label>
                  <Input
                    id="reorder-quantity"
                    type="number"
                    min="1"
                    placeholder="How much to reorder"
                    value={adjustmentForm.reorderQuantity}
                    onChange={(e) => setAdjustmentForm(prev => ({ 
                      ...prev, 
                      reorderQuantity: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAdjustment}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAdjustment} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}