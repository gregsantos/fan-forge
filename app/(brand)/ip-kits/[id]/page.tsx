"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AssetGallery } from "@/components/ip-kits/asset-gallery"
import { AssetUploadZone } from "@/components/ip-kits/asset-upload-zone"
import { Asset } from "@/types"
import { 
  ArrowLeft, 
  Edit, 
  Eye, 
  Upload, 
  Download, 
  Share,
  Calendar,
  Package,
  Image,
  Settings
} from "lucide-react"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

interface IpKitDetail {
  id: string
  name: string
  description?: string
  guidelines?: string
  brandId: string
  isPublished: boolean
  version: number
  createdAt: string
  updatedAt: string
  brandName: string
  brandDescription?: string
  assetCount: number
  assets: Asset[]
}

export default function IpKitDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [ipKit, setIpKit] = useState<IpKitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const ipKitId = params.id as string

  const fetchIpKit = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/ip-kits/${ipKitId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('IP Kit not found')
        }
        throw new Error('Failed to fetch IP kit')
      }

      const data = await response.json()
      setIpKit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load IP kit')
    } finally {
      setLoading(false)
    }
  }, [ipKitId])

  useEffect(() => {
    if (ipKitId) {
      fetchIpKit()
    }
  }, [ipKitId, fetchIpKit])

  const handleAssetsUploaded = async (uploadResults: any[]) => {
    // Create asset records in the database
    for (const result of uploadResults) {
      try {
        const response = await fetch('/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: result.assetUrl.split('/').pop() || 'asset',
            originalFilename: result.assetUrl.split('/').pop() || 'asset',
            url: result.assetUrl,
            thumbnailUrl: result.thumbnailUrl,
            category: 'other', // This should be passed from the upload component
            tags: [],
            metadata: result.metadata,
            ipId: result.ipId, // Include ipId if provided
            ipKitId: ipKitId
          })
        })

        if (!response.ok) {
          console.error('Failed to create asset record')
        }
      } catch (error) {
        console.error('Error creating asset record:', error)
      }
    }

    // Refresh the IP kit data
    fetchIpKit()
  }

  const handleAssetDeleted = (assetId: string) => {
    // Remove asset from local state and refresh
    setIpKit(prev => {
      if (!prev) return prev
      return {
        ...prev,
        assets: prev.assets.filter(asset => asset.id !== assetId),
        assetCount: prev.assetCount - 1
      }
    })
  }

  const handlePublishToggle = async () => {
    if (!ipKit) return

    try {
      const response = await fetch(`/api/ip-kits/${ipKitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPublished: !ipKit.isPublished
        })
      })

      if (response.ok) {
        fetchIpKit() // Refresh data
      } else {
        console.error('Failed to update publish status')
      }
    } catch (error) {
      console.error('Error updating publish status:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={fetchIpKit}>
              Retry
            </Button>
            <Button variant="outline" onClick={() => router.push('/ip-kits')}>
              Back to IP Kits
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!ipKit) {
    return null
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/ip-kits">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold">{ipKit.name}</h1>
              {ipKit.isPublished ? (
                <Badge variant="default" className="bg-green-600">
                  Published v{ipKit.version}
                </Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {ipKit.description || 'No description provided'}
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Brand: {ipKit.brandName}</span>
              <span>•</span>
              <span>Created: {formatDate(ipKit.createdAt)}</span>
              <span>•</span>
              <span>Last updated: {formatDate(ipKit.updatedAt)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePublishToggle}>
            {ipKit.isPublished ? <Eye className="mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
            {ipKit.isPublished ? 'Unpublish' : 'Publish'}
          </Button>
          <Link href={`/ip-kits/${ipKit.id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button>
            <Share className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ipKit.assetCount}</p>
                <p className="text-sm text-muted-foreground">Assets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Download className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Downloads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">v{ipKit.version}</p>
                <p className="text-sm text-muted-foreground">Version</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assets">Assets ({ipKit.assetCount})</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Guidelines */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Creative Guidelines</CardTitle>
                  <CardDescription>
                    Instructions for creators using this IP kit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ipKit.guidelines ? (
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{ipKit.guidelines}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No guidelines provided yet. Consider adding guidelines to help creators use your assets effectively.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Info Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">
                      {ipKit.isPublished ? 'Published and available to creators' : 'Draft - not visible to creators'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Version</p>
                    <p className="text-sm text-muted-foreground">v{ipKit.version}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Brand</p>
                    <p className="text-sm text-muted-foreground">{ipKit.brandName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-sm text-muted-foreground">{formatDate(ipKit.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Asset Library</CardTitle>
              <CardDescription>
                All assets included in this IP kit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <AssetGallery
                  assets={ipKit.assets}
                  onAssetDeleted={handleAssetDeleted}
                  className="mt-6"
                />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          {/* Upload by Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {['characters', 'backgrounds', 'logos', 'titles', 'props', 'other'].map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category}</CardTitle>
                  <CardDescription>
                    Upload {category} assets for this IP kit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary>
                    <AssetUploadZone
                      ipKitId={ipKit.id}
                      category={category as any}
                      onAssetsUploaded={handleAssetsUploaded}
                      maxFiles={10}
                      showIpIdInput={true}
                    />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>IP Kit Settings</CardTitle>
              <CardDescription>
                Manage settings and advanced options for this IP kit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Edit IP Kit</h4>
                    <p className="text-sm text-muted-foreground">
                      Update basic information, guidelines, and settings
                    </p>
                  </div>
                  <Link href={`/ip-kits/${ipKit.id}/edit`}>
                    <Button variant="outline">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Publish Status</h4>
                    <p className="text-sm text-muted-foreground">
                      {ipKit.isPublished 
                        ? 'This IP kit is live and available to creators'
                        : 'This IP kit is a draft and not visible to creators'
                      }
                    </p>
                  </div>
                  <Button variant="outline" onClick={handlePublishToggle}>
                    {ipKit.isPublished ? 'Unpublish' : 'Publish'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}