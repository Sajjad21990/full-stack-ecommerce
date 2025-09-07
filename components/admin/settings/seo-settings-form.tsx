'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Save, 
  RefreshCw,
  Search,
  Globe,
  BarChart3,
  FileText,
  Image,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { updateSEOSettings } from '@/lib/admin/actions/settings'

interface SEOSettingsFormProps {
  settings: Record<string, any>
}

export default function SEOSettingsForm({ settings }: SEOSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Meta Tags
    metaTitle: settings.metaTitle || '',
    metaDescription: settings.metaDescription || '',
    metaKeywords: settings.metaKeywords || '',
    
    // Open Graph
    ogTitle: settings.ogTitle || '',
    ogDescription: settings.ogDescription || '',
    ogImage: settings.ogImage || '',
    
    // Twitter Card
    twitterCard: settings.twitterCard || 'summary_large_image',
    twitterSite: settings.twitterSite || '',
    
    // Technical SEO
    enableSitemap: settings.enableSitemap ?? true,
    enableRobotsTxt: settings.enableRobotsTxt ?? true,
    robotsTxtContent: settings.robotsTxtContent || `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://yourstore.com/sitemap.xml`,
    
    // Analytics & Tracking
    googleAnalyticsId: settings.googleAnalyticsId || '',
    googleTagManagerId: settings.googleTagManagerId || '',
    facebookPixelId: settings.facebookPixelId || '',
    
    // Advanced SEO
    enableStructuredData: settings.enableStructuredData ?? true,
    enableCanonicalUrls: settings.enableCanonicalUrls ?? true,
    defaultImageAlt: settings.defaultImageAlt || '',
    enableImageSEO: settings.enableImageSEO ?? true
  })

  const handleSave = async () => {
    setLoading(true)
    
    try {
      const result = await updateSEOSettings(formData)
      
      if (result.success) {
        toast.success('SEO settings updated successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const twitterCardOptions = [
    { value: 'summary', label: 'Summary' },
    { value: 'summary_large_image', label: 'Summary with Large Image' },
    { value: 'app', label: 'App Card' },
    { value: 'player', label: 'Player Card' }
  ]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="meta" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="meta">Meta Tags</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="technical">Technical SEO</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                Meta Tags & Search Engine Optimization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, metaTitle: e.target.value }))}
                  placeholder="Your Store Name - Best Products Online"
                  maxLength={60}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Appears in search results and browser tabs</span>
                  <span>{formData.metaTitle.length}/60 characters</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metaDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, metaDescription: e.target.value }))}
                  placeholder="Shop the best products online. Free shipping on orders over $100. Quality guaranteed."
                  maxLength={160}
                  rows={3}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Brief description shown in search results</span>
                  <span>{formData.metaDescription.length}/160 characters</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaKeywords">Meta Keywords</Label>
                <Input
                  id="metaKeywords"
                  value={formData.metaKeywords}
                  onChange={(e) => setFormData(prev => ({ ...prev, metaKeywords: e.target.value }))}
                  placeholder="ecommerce, online store, shopping, products"
                />
                <p className="text-sm text-muted-foreground">
                  Comma-separated keywords (less important for modern SEO)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-green-500" />
                Open Graph (Facebook) Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ogTitle">Open Graph Title</Label>
                <Input
                  id="ogTitle"
                  value={formData.ogTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, ogTitle: e.target.value }))}
                  placeholder="Your Store - Shop the Best Products Online"
                />
                <p className="text-sm text-muted-foreground">
                  Title when shared on Facebook, LinkedIn, etc.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ogDescription">Open Graph Description</Label>
                <Textarea
                  id="ogDescription"
                  value={formData.ogDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, ogDescription: e.target.value }))}
                  placeholder="Discover amazing products with fast shipping and excellent customer service."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ogImage">Open Graph Image URL</Label>
                <Input
                  id="ogImage"
                  value={formData.ogImage}
                  onChange={(e) => setFormData(prev => ({ ...prev, ogImage: e.target.value }))}
                  placeholder="https://yourstore.com/og-image.jpg"
                />
                <p className="text-sm text-muted-foreground">
                  Recommended size: 1200x630 pixels. Image shown when sharing links.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
                Twitter Card Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twitterCard">Twitter Card Type</Label>
                <Select
                  value={formData.twitterCard}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, twitterCard: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {twitterCardOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitterSite">Twitter Site Handle</Label>
                <Input
                  id="twitterSite"
                  value={formData.twitterSite}
                  onChange={(e) => setFormData(prev => ({ ...prev, twitterSite: e.target.value }))}
                  placeholder="@yourstore"
                />
                <p className="text-sm text-muted-foreground">
                  Your Twitter username (including @)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                Technical SEO Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableSitemap">Generate Sitemap</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically generate XML sitemap for search engines
                  </p>
                </div>
                <Switch
                  id="enableSitemap"
                  checked={formData.enableSitemap}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableSitemap: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableRobotsTxt">Generate robots.txt</Label>
                  <p className="text-sm text-muted-foreground">
                    Create robots.txt file to guide search engine crawlers
                  </p>
                </div>
                <Switch
                  id="enableRobotsTxt"
                  checked={formData.enableRobotsTxt}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableRobotsTxt: checked }))}
                />
              </div>

              {formData.enableRobotsTxt && (
                <div className="space-y-2">
                  <Label htmlFor="robotsTxtContent">robots.txt Content</Label>
                  <Textarea
                    id="robotsTxtContent"
                    value={formData.robotsTxtContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, robotsTxtContent: e.target.value }))}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ExternalLink className="h-4 w-4" />
                    <span>Will be available at /robots.txt</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                Analytics & Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                <Input
                  id="googleAnalyticsId"
                  value={formData.googleAnalyticsId}
                  onChange={(e) => setFormData(prev => ({ ...prev, googleAnalyticsId: e.target.value }))}
                  placeholder="G-XXXXXXXXXX"
                />
                <p className="text-sm text-muted-foreground">
                  Your Google Analytics 4 measurement ID
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleTagManagerId">Google Tag Manager ID</Label>
                <Input
                  id="googleTagManagerId"
                  value={formData.googleTagManagerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, googleTagManagerId: e.target.value }))}
                  placeholder="GTM-XXXXXXX"
                />
                <p className="text-sm text-muted-foreground">
                  Your Google Tag Manager container ID
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebookPixelId">Facebook Pixel ID</Label>
                <Input
                  id="facebookPixelId"
                  value={formData.facebookPixelId}
                  onChange={(e) => setFormData(prev => ({ ...prev, facebookPixelId: e.target.value }))}
                  placeholder="123456789012345"
                />
                <p className="text-sm text-muted-foreground">
                  Your Facebook Pixel ID for conversion tracking
                </p>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg bg-blue-50">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Privacy Compliance</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Ensure you have proper privacy policies and cookie consent in place when using tracking codes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-indigo-500" />
                Advanced SEO Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableStructuredData">Structured Data (Schema.org)</Label>
                  <p className="text-sm text-muted-foreground">
                    Add structured data markup for better search results
                  </p>
                </div>
                <Switch
                  id="enableStructuredData"
                  checked={formData.enableStructuredData}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableStructuredData: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableCanonicalUrls">Canonical URLs</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent duplicate content issues with canonical tags
                  </p>
                </div>
                <Switch
                  id="enableCanonicalUrls"
                  checked={formData.enableCanonicalUrls}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableCanonicalUrls: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableImageSEO">Image SEO Optimization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically optimize image alt tags and file names
                  </p>
                </div>
                <Switch
                  id="enableImageSEO"
                  checked={formData.enableImageSEO}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enableImageSEO: checked }))}
                />
              </div>

              {formData.enableImageSEO && (
                <div className="space-y-2 pl-4 border-l-2 border-indigo-200">
                  <Label htmlFor="defaultImageAlt">Default Image Alt Text Template</Label>
                  <Input
                    id="defaultImageAlt"
                    value={formData.defaultImageAlt}
                    onChange={(e) => setFormData(prev => ({ ...prev, defaultImageAlt: e.target.value }))}
                    placeholder="{productName} - {storeName}"
                  />
                  <p className="text-sm text-muted-foreground">
                    Template for auto-generated alt text. Variables: {'{productName}'}, {'{storeName}'}, {'{categoryName}'}
                  </p>
                </div>
              )}

              <div className="grid gap-4">
                <h4 className="font-medium">SEO Health Check</h4>
                <div className="space-y-2">
                  {[
                    { label: 'Meta Title', check: !!formData.metaTitle, required: true },
                    { label: 'Meta Description', check: !!formData.metaDescription, required: true },
                    { label: 'Open Graph Image', check: !!formData.ogImage, required: false },
                    { label: 'Analytics Tracking', check: !!(formData.googleAnalyticsId || formData.googleTagManagerId), required: false },
                    { label: 'Sitemap Enabled', check: formData.enableSitemap, required: true },
                    { label: 'Robots.txt Enabled', check: formData.enableRobotsTxt, required: true }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {item.check ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                        )}
                        {item.label}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.check 
                          ? 'bg-green-100 text-green-800' 
                          : item.required 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.check ? 'Configured' : item.required ? 'Required' : 'Recommended'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  )
}