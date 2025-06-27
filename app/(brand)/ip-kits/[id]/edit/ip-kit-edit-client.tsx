"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Upload,
  Package,
  Image,
  Settings,
  Plus,
  Trash2
} from "lucide-react"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { IpKitAssetGallery } from "@/components/ip-kits/ip-kit-asset-gallery"
import { AssetUploadZone } from "@/components/ip-kits/asset-upload-zone"
import { AddAssetsModal } from "@/components/ip-kits/add-assets-modal"
import { Asset } from "@/types"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface Brand {
  id: string
  name: string
  description?: string
}

interface IpKitDetail {
  id: string
  name: string
  description?: string
  guidelines?: string
  brandId: string
  isPublished: boolean
  version: number
  createdAt: Date
  updatedAt: Date
  brandName: string
  brandDescription?: string
  assetCount: number
  assets: Asset[]
}

interface IpKitEditClientProps {
  ipKit: IpKitDetail
  availableBrands: Brand[]
}

export default function IpKitEditClient({ ipKit, availableBrands }: IpKitEditClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  // Form state
  const [formData, setFormData] = useState({
    name: ipKit.name,
    description: ipKit.description || '',
    guidelines: ipKit.guidelines || '',
    isPublished: ipKit.isPublished
  })
  
  const [assets, setAssets] = useState<Asset[]>(ipKit.assets)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [addAssetsModalOpen, setAddAssetsModalOpen] = useState(false)

  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const handleSave = useCallback(async () => {
    try {
      setSaving(true)

      const response = await fetch(`/api/ip-kits/${ipKit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update IP kit')
      }

      toast({
        title: "IP Kit Updated",
        description: "Your changes have been saved successfully.",
      })

      // Refresh the router cache to update server data across the app
      router.refresh()
      
      // Redirect to detail page
      router.push(`/ip-kits/${ipKit.id}`)
    } catch (error) {
      console.error('Error saving IP kit:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [formData, ipKit.id, router, toast])

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
            category: 'other',
            tags: [],
            metadata: result.metadata,
            ipId: result.ipId,
            ipKitId: ipKit.id
          })
        })

        if (!response.ok) {
          console.error('Failed to create asset record')
        } else {
          const newAsset = await response.json()
          setAssets(prev => [...prev, newAsset])
        }
      } catch (error) {
        console.error('Error creating asset record:', error)
      }
    }
  }

  const handleAssetRemovedFromIpKit = (assetId: string) => {
    setAssets(prev => prev.filter(asset => asset.id !== assetId))
  }

  const handleAssetsAdded = (addedAssets: Asset[]) => {
    setAssets(prev => [...prev, ...addedAssets])
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/ip-kits/${ipKit.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold">Edit IP Kit</h1>
              {ipKit.isPublished ? (
                <Badge variant="default" className="bg-green-600">
                  Published v{ipKit.version}
                </Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Make changes to your IP kit and manage its assets
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
          <Link href={`/ip-kits/${ipKit.id}`}>
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
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
                <p className="text-2xl font-bold">{assets.length}</p>
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
              <div className="p-3 bg-orange-100 rounded-lg">
                <Settings className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">v{ipKit.version}</p>
                <p className="text-sm text-muted-foreground">Version</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${formData.isPublished ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Upload className={`h-6 w-6 ${formData.isPublished ? 'text-green-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{formData.isPublished ? 'Live' : 'Draft'}</p>
                <p className="text-sm text-muted-foreground">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update your IP kit&apos;s basic details and guidelines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter IP kit name"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of this IP kit"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guidelines">Creative Guidelines</Label>
                  <Textarea
                    id="guidelines"
                    value={formData.guidelines}
                    onChange={(e) => handleInputChange('guidelines', e.target.value)}
                    placeholder="Instructions for creators using this IP kit..."
                    rows={6}
                    className="min-h-[150px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Provide clear guidelines on how creators should use these assets, including any restrictions or requirements.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Asset Library</CardTitle>
                  <CardDescription>
                    Manage all assets included in this IP kit
                  </CardDescription>
                </div>
                <Button onClick={() => setAddAssetsModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Assets
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <IpKitAssetGallery
                  ipKitId={ipKit.id}
                  assets={assets}
                  onAssetRemovedFromIpKit={handleAssetRemovedFromIpKit}
                  isEditing={true}
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
                Advanced settings and publish options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Publish Status</h4>
                  <p className="text-sm text-muted-foreground">
                    {formData.isPublished 
                      ? 'This IP kit is live and available to creators'
                      : 'This IP kit is a draft and not visible to creators'
                    }
                  </p>
                </div>
                <Switch
                  checked={formData.isPublished}
                  onCheckedChange={(checked) => handleInputChange('isPublished', checked)}
                />
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-destructive">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground">
                      These actions cannot be undone. Please be careful.
                    </p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 border border-destructive/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">Delete IP Kit</h5>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this IP kit and all its data
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" disabled>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Assets Modal */}
      <AddAssetsModal
        open={addAssetsModalOpen}
        onOpenChange={setAddAssetsModalOpen}
        ipKitId={ipKit.id}
        onAssetsAdded={handleAssetsAdded}
        existingAssetIds={assets.map(asset => asset.id)}
      />
    </div>
  )
}