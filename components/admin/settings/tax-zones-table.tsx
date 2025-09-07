'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit, Trash2, Globe, MapPin } from 'lucide-react'

interface TaxZone {
  id: string
  name: string
  country: string
  state: string
  taxRate: number
  taxName: string
  isActive: boolean
}

interface TaxZonesTableProps {
  zones: TaxZone[]
}

export default function TaxZonesTable({ zones }: TaxZonesTableProps) {
  if (!zones || zones.length === 0) {
    return (
      <div className="text-center py-8">
        <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No tax zones configured</h3>
        <p className="text-muted-foreground mb-4">
          Set up tax zones to calculate taxes based on customer location
        </p>
        <Button>
          <MapPin className="h-4 w-4 mr-2" />
          Create Tax Zone
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zone Name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Tax Name</TableHead>
            <TableHead>Rate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.map((zone) => (
            <TableRow key={zone.id}>
              <TableCell className="font-medium">{zone.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {zone.country}
                    {zone.state !== 'All' && `, ${zone.state}`}
                  </span>
                </div>
              </TableCell>
              <TableCell>{zone.taxName}</TableCell>
              <TableCell>
                <span className="font-mono font-medium">
                  {zone.taxRate}%
                </span>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={zone.isActive ? "default" : "secondary"}
                  className={zone.isActive ? "bg-green-100 text-green-800" : ""}
                >
                  {zone.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}