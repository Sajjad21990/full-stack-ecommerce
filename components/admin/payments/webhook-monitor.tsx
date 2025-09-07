'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Activity,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { formatDate, formatDuration } from '@/lib/utils'
import { toast } from 'sonner'

interface WebhookDelivery {
  id: string
  eventType: string
  status: 'success' | 'failed' | 'pending'
  processingTime: number
  attempts: number
  payload: any
  response: any
  createdAt: string
  completedAt: string
}

interface WebhookStats {
  total: number
  successful: number
  failed: number
  averageProcessingTime: number
  successRate: number
}

export function WebhookMonitor() {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [stats, setStats] = useState<WebhookStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchWebhookData = async () => {
    try {
      // Import real webhook monitoring functions
      const { 
        getWebhookStats, 
        getRecentWebhookDeliveries 
      } = await import('@/lib/admin/queries/webhook-monitoring')

      // Fetch real data from database
      const [realStats, realDeliveries] = await Promise.all([
        getWebhookStats(7), // Last 7 days
        getRecentWebhookDeliveries(50)
      ])

      setStats(realStats)
      setDeliveries(realDeliveries)
      
    } catch (error) {
      console.error('Error fetching webhook data:', error)
      toast.error('Failed to load webhook data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWebhookData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchWebhookData()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      success: 'default' as const,
      failed: 'destructive' as const,
      pending: 'secondary' as const
    }
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Total Webhooks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <div className="text-2xl font-bold text-green-600">{stats.successRate}%</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Success Rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <div className="text-2xl font-bold">{stats.successful}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Successful
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              </div>
              <p className="text-xs text-muted-foreground">
                Failed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Deliveries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Webhook Deliveries</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Processing Time</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No webhook deliveries found
                    </TableCell>
                  </TableRow>
                ) : (
                  deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(delivery.status)}
                          {getStatusBadge(delivery.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{delivery.eventType}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {delivery.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {delivery.processingTime}ms
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {delivery.attempts} attempt{delivery.attempts !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(new Date(delivery.createdAt))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {delivery.completedAt 
                            ? formatDate(new Date(delivery.completedAt))
                            : '-'
                          }
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}