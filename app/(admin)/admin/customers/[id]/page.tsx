import { notFound } from 'next/navigation'
import { getCustomerById } from '@/lib/admin/queries/customers'
import CustomerProfile from '@/components/admin/customers/customer-profile'
import CustomerOrders from '@/components/admin/customers/customer-orders'
import CustomerActions from '@/components/admin/customers/customer-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Edit, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'
import Image from 'next/image'

interface PageProps {
  params: {
    id: string
  }
}

export default async function CustomerDetailsPage({ params }: PageProps) {
  const customer = await getCustomerById(params.id)

  if (!customer) {
    notFound()
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      blocked: 'bg-red-100 text-red-800'
    }

    return (
      <Badge variant="outline" className={colors[status]}>
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full overflow-hidden bg-gray-100">
              {customer.image ? (
                <Image
                  src={customer.image}
                  alt={customer.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-2xl font-medium">
                  {customer.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {customer.name}
                </h1>
                {getStatusBadge(customer.status)}
                <Badge variant={customer.emailVerified ? 'default' : 'secondary'}>
                  {customer.emailVerified ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{customer.email}</span>
                {customer.phone && (
                  <>
                    <span>•</span>
                    <span>{customer.phone}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders ({customer.stats.orderCount})</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="groups">Groups</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{customer.stats.orderCount}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Spent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(customer.stats.totalSpent)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Order Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(customer.stats.averageOrderValue)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Customer Since
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">{formatDate(new Date(customer.createdAt))}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Last Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">
                      {customer.stats.lastOrderDate 
                        ? formatDate(new Date(customer.stats.lastOrderDate))
                        : 'Never'
                      }
                    </div>
                  </CardContent>
                </Card>

                {customer.favoriteProducts.length > 0 && (
                  <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader>
                      <CardTitle>Favorite Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {customer.favoriteProducts.map((product, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="font-medium">{product.productName}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{product.totalQuantity} purchased</span>
                              <span>•</span>
                              <span>{product.orderCount} orders</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <CustomerOrders orders={customer.orders} customerId={customer.id} />
            </TabsContent>

            <TabsContent value="addresses">
              <div className="grid gap-4 md:grid-cols-2">
                {customer.addresses.map((address, index) => (
                  <Card key={address.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {address.type === 'shipping' ? 'Shipping Address' : 'Billing Address'}
                        {address.isDefault && (
                          <Badge variant="outline" className="ml-2">Default</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-1">
                        <p className="font-medium">
                          {address.firstName} {address.lastName}
                        </p>
                        <p>{address.addressLine1}</p>
                        {address.addressLine2 && <p>{address.addressLine2}</p>}
                        <p>{address.city}, {address.state} {address.postalCode}</p>
                        <p>{address.country}</p>
                        {address.phone && <p>Phone: {address.phone}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {customer.addresses.length === 0 && (
                  <Card className="col-span-2">
                    <CardContent className="py-8">
                      <p className="text-center text-muted-foreground">No addresses saved</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="groups">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  {customer.groups.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {customer.groups.map((group) => (
                        <Badge key={group.id} variant="secondary">
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Not assigned to any groups</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <CustomerActions customer={customer} />
        </div>
      </div>
    </div>
  )
}