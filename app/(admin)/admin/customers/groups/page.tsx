import { Suspense } from 'react'
import { getCustomerGroups } from '@/lib/admin/queries/customers'
import CustomerGroupsList from '@/components/admin/customers/customer-groups-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function CustomerGroupsPage() {
  const groups = await getCustomerGroups()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customer Groups</h1>
            <p className="text-muted-foreground">
              Organize customers into segments for targeted marketing
            </p>
          </div>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Groups ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading groups...</div>}>
            <CustomerGroupsList groups={groups} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}