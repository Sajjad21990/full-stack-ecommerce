'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  AlertTriangle, 
  Shield, 
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Ban,
  Clock,
  DollarSign,
  Users,
  Globe,
  Zap
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface SecurityMetrics {
  totalTransactions: number
  fraudDetected: number
  fraudBlocked: number
  rateLimitViolations: number
  successRate: number
  averageRiskScore: number
  highRiskTransactions: number
  ipWhitelistHits: number
}

interface RiskEvent {
  id: string
  type: 'fraud_detected' | 'rate_limit' | 'high_risk' | 'ip_blocked'
  timestamp: string
  paymentId?: string
  orderId?: string
  ip: string
  riskScore?: number
  reason: string
  action: 'blocked' | 'flagged' | 'allowed'
  details: any
}

interface FraudPattern {
  pattern: string
  occurrences: number
  riskLevel: 'low' | 'medium' | 'high'
  affectedTransactions: number
  lastOccurrence: string
}

interface IPAnalytics {
  ip: string
  country: string
  requests: number
  violations: number
  lastSeen: string
  riskScore: number
  status: 'whitelisted' | 'blacklisted' | 'unknown'
}

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([])
  const [fraudPatterns, setFraudPatterns] = useState<FraudPattern[]>([])
  const [ipAnalytics, setIpAnalytics] = useState<IPAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')

  const fetchSecurityData = async () => {
    try {
      // Import the real security query functions
      const { 
        getSecurityMetrics, 
        getRiskEvents, 
        getFraudPatterns, 
        getIPAnalytics 
      } = await import('@/lib/admin/queries/payments-security')

      // Fetch real data from database
      const [
        realMetrics,
        realRiskEvents,
        realFraudPatterns,
        realIpAnalytics
      ] = await Promise.all([
        getSecurityMetrics(),
        getRiskEvents(50),
        getFraudPatterns(),
        getIPAnalytics(100)
      ])

      setMetrics(realMetrics)
      setRiskEvents(realRiskEvents)
      setFraudPatterns(realFraudPatterns)
      setIpAnalytics(realIpAnalytics)
      
    } catch (error) {
      console.error('Error fetching security data:', error)
      toast.error('Failed to load security data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSecurityData()
  }, [selectedTimeRange])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchSecurityData()
  }

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'fraud_detected':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'rate_limit':
        return <Zap className="w-4 h-4 text-yellow-500" />
      case 'high_risk':
        return <Shield className="w-4 h-4 text-orange-500" />
      case 'ip_blocked':
        return <Ban className="w-4 h-4 text-red-500" />
      default:
        return <Activity className="w-4 h-4 text-gray-400" />
    }
  }

  const getEventTypeBadge = (type: string) => {
    const variants = {
      fraud_detected: 'destructive' as const,
      rate_limit: 'secondary' as const,
      high_risk: 'default' as const,
      ip_blocked: 'destructive' as const
    }
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'secondary'}>
        {type.replace('_', ' ')}
      </Badge>
    )
  }

  const getActionBadge = (action: string) => {
    const variants = {
      blocked: 'destructive' as const,
      flagged: 'secondary' as const,
      allowed: 'default' as const
    }
    
    return (
      <Badge variant={variants[action as keyof typeof variants] || 'secondary'}>
        {action}
      </Badge>
    )
  }

  const getRiskLevelBadge = (level: string) => {
    const variants = {
      low: 'default' as const,
      medium: 'secondary' as const,
      high: 'destructive' as const
    }
    
    return (
      <Badge variant={variants[level as keyof typeof variants] || 'secondary'}>
        {level} risk
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      whitelisted: 'default' as const,
      blacklisted: 'destructive' as const,
      unknown: 'secondary' as const
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Security Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(8)].map((_, i) => (
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
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Security Dashboard</h2>
        <div className="flex items-center gap-2">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <div className="text-2xl font-bold">{metrics.totalTransactions.toLocaleString()}</div>
              </div>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                <div className="text-2xl font-bold text-green-600">{metrics.successRate}%</div>
              </div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <div className="text-2xl font-bold text-red-600">{metrics.fraudBlocked}</div>
              </div>
              <p className="text-xs text-muted-foreground">Fraud Blocked</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <div className="text-2xl font-bold text-yellow-600">{metrics.rateLimitViolations}</div>
              </div>
              <p className="text-xs text-muted-foreground">Rate Limit Violations</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <div className="text-2xl font-bold text-orange-600">{metrics.averageRiskScore.toFixed(1)}</div>
              </div>
              <p className="text-xs text-muted-foreground">Avg Risk Score</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <div className="text-2xl font-bold text-orange-600">{metrics.highRiskTransactions}</div>
              </div>
              <p className="text-xs text-muted-foreground">High Risk Transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-500" />
                <div className="text-2xl font-bold text-purple-600">{metrics.fraudDetected}</div>
              </div>
              <p className="text-xs text-muted-foreground">Fraud Detected</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-500" />
                <div className="text-2xl font-bold text-indigo-600">{metrics.ipWhitelistHits}</div>
              </div>
              <p className="text-xs text-muted-foreground">Whitelist Hits</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Tabs */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList>
          <TabsTrigger value="events">Risk Events</TabsTrigger>
          <TabsTrigger value="patterns">Fraud Patterns</TabsTrigger>
          <TabsTrigger value="ips">IP Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No security events found
                        </TableCell>
                      </TableRow>
                    ) : (
                      riskEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getEventTypeIcon(event.type)}
                              {getEventTypeBadge(event.type)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(new Date(event.timestamp))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm">{event.ip}</div>
                          </TableCell>
                          <TableCell>
                            {event.riskScore ? (
                              <div className={`font-bold ${
                                event.riskScore >= 70 ? 'text-red-600' : 
                                event.riskScore >= 40 ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                {event.riskScore}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm max-w-xs truncate" title={event.reason}>
                              {event.reason}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getActionBadge(event.action)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Occurrences</TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Affected Transactions</TableHead>
                      <TableHead>Last Occurrence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fraudPatterns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No fraud patterns detected
                        </TableCell>
                      </TableRow>
                    ) : (
                      fraudPatterns.map((pattern, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{pattern.pattern}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-2xl font-bold">{pattern.occurrences}</div>
                          </TableCell>
                          <TableCell>
                            {getRiskLevelBadge(pattern.riskLevel)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{pattern.affectedTransactions} transactions</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(new Date(pattern.lastOccurrence))}
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
        </TabsContent>

        <TabsContent value="ips" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>IP Address Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Requests</TableHead>
                      <TableHead>Violations</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipAnalytics.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No IP analytics data available
                        </TableCell>
                      </TableRow>
                    ) : (
                      ipAnalytics.map((ip) => (
                        <TableRow key={ip.ip}>
                          <TableCell>
                            <div className="font-mono text-sm">{ip.ip}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{ip.country}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{ip.requests}</div>
                          </TableCell>
                          <TableCell>
                            <div className={`text-sm font-medium ${
                              ip.violations > 10 ? 'text-red-600' : 
                              ip.violations > 5 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {ip.violations}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`font-bold ${
                              ip.riskScore >= 70 ? 'text-red-600' : 
                              ip.riskScore >= 40 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {ip.riskScore}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(ip.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {formatDate(new Date(ip.lastSeen))}
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
        </TabsContent>
      </Tabs>
    </div>
  )
}