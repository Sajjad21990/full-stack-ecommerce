import { notFound } from 'next/navigation'
import { getOrderById } from '@/lib/admin/queries/orders'
import OrderDetails from '@/components/admin/orders/order-details'
import OrderTimeline from '@/components/admin/orders/order-timeline'
import OrderActions from '@/components/admin/orders/order-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Mail, Printer, Edit } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/utils'

interface PageProps {
  params: {
    id: string
  }
}

export default async function OrderDetailsPage({ params }: PageProps) {
  const order = await getOrderById(params.id)

  if (!order) {
    notFound()
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800'
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
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Order #{order.orderNumber}
              </h1>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-muted-foreground">
              Created on {formatDate(new Date(order.createdAt))} at {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>
          <Button size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <OrderDetails order={order} />
          
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="refunds">Refunds</TabsTrigger>
              <TabsTrigger value="emails">Email History</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline">
              <OrderTimeline orderId={order.id} history={order.statusHistory} />
            </TabsContent>
            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>Order Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {order.statusHistory
                    .filter(h => h.fromStatus === 'note' && h.toStatus === 'note')
                    .map((note, index) => (
                      <div key={index} className="border-b py-3 last:border-0">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{note.changedByEmail}</span>
                          <span>{formatDate(new Date(note.createdAt))}</span>
                        </div>
                        <p className="mt-1">{note.note}</p>
                      </div>
                    ))
                  }
                  {order.statusHistory.filter(h => h.fromStatus === 'note').length === 0 && (
                    <p className="text-muted-foreground">No notes added yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="refunds">
              <Card>
                <CardHeader>
                  <CardTitle>Refunds</CardTitle>
                </CardHeader>
                <CardContent>
                  {order.payments
                    .filter(p => p.status === 'refunded')
                    .map((refund, index) => (
                      <div key={index} className="border-b py-3 last:border-0">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {formatCurrency(Math.abs(refund.amount))}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(new Date(refund.refundedAt!))}
                          </span>
                        </div>
                        {refund.refundReason && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Reason: {refund.refundReason}
                          </p>
                        )}
                      </div>
                    ))
                  }
                  {order.payments.filter(p => p.status === 'refunded').length === 0 && (
                    <p className="text-muted-foreground">No refunds processed</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="emails">
              <Card>
                <CardHeader>
                  <CardTitle>Email History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Email history will be shown here</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <OrderActions order={order} />
          
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-medium">
                  {order.customer?.name || `${order.shippingAddress?.firstName} ${order.shippingAddress?.lastName}`}
                </p>
                <p className="text-sm text-muted-foreground">{order.email}</p>
                {order.phone && (
                  <p className="text-sm text-muted-foreground">{order.phone}</p>
                )}
              </div>
              {order.customer && (
                <Link href={`/admin/customers/${order.customer.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Customer
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              {order.shippingAddress ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && (
                    <p>{order.shippingAddress.addressLine2}</p>
                  )}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No shipping address</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent>
              {order.billingAddress ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">
                    {order.billingAddress.firstName} {order.billingAddress.lastName}
                  </p>
                  <p>{order.billingAddress.addressLine1}</p>
                  {order.billingAddress.addressLine2 && (
                    <p>{order.billingAddress.addressLine2}</p>
                  )}
                  <p>
                    {order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}
                  </p>
                  <p>{order.billingAddress.country}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Same as shipping address</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}