"use client"

import {useState, useEffect, useCallback} from "react"
import {useParams, useRouter} from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {IpKitAssetGallery} from "@/components/ip-kits/ip-kit-asset-gallery"
import {AssetUploadZone} from "@/components/ip-kits/asset-upload-zone"
import {AddAssetsModal} from "@/components/ip-kits/add-assets-modal"
import {Asset} from "@/types"
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
  Settings,
  Plus,
} from "lucide-react"
import {ErrorBoundary} from "@/components/ui/error-boundary"
import {Skeleton} from "@/components/ui/skeleton"
import Link from "next/link"
import {useAssetUpload} from "@/lib/hooks/use-asset-upload"
import {cn} from "@/lib/utils"

function getIpKitStatusColor(isPublished: boolean) {
  return isPublished
    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-transparent"
    : "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-transparent"
}

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
  const [addAssetsModalOpen, setAddAssetsModalOpen] = useState(false)

  const ipKitId = params.id as string

  const fetchIpKit = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/ip-kits/${ipKitId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("IP Kit not found")
        }
        throw new Error("Failed to fetch IP kit")
      }

      const data = await response.json()
      setIpKit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load IP kit")
    } finally {
      setLoading(false)
    }
  }, [ipKitId])

  useEffect(() => {
    if (ipKitId) {
      fetchIpKit()
    }
  }, [ipKitId, fetchIpKit])

  const {handleUpload} = useAssetUpload({
    ipKitId: ipKitId,
    onSuccess: result => {
      console.log(`Successfully created ${result.success} asset records`)
    },
    onError: errors => {
      alert(`Upload completed with some failures. Check console for details.`)
    },
    onRefresh: fetchIpKit,
  })

  const handleAssetsUploaded = async (uploadResults: any[]) => {
    await handleUpload(uploadResults)
  }

  const handleAssetRemovedFromIpKit = (assetId: string) => {
    // Remove asset from local state (asset is removed from IP kit, not deleted)
    setIpKit(prev => {
      if (!prev) return prev
      return {
        ...prev,
        assets: prev.assets.filter(asset => asset.id !== assetId),
        assetCount: prev.assetCount - 1,
      }
    })
  }

  const handleAssetsAdded = (addedAssets: Asset[]) => {
    // Add assets to local state
    setIpKit(prev => {
      if (!prev) return prev
      return {
        ...prev,
        assets: [...prev.assets, ...addedAssets],
        assetCount: prev.assetCount + addedAssets.length,
      }
    })
  }

  const handlePublishToggle = async () => {
    if (!ipKit) return

    try {
      const response = await fetch(`/api/ip-kits/${ipKitId}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          isPublished: !ipKit.isPublished,
        }),
      })

      if (response.ok) {
        fetchIpKit() // Refresh data
      } else {
        console.error("Failed to update publish status")
      }
    } catch (error) {
      console.error("Error updating publish status:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className='container mx-auto py-8 max-w-6xl'>
        <div className='space-y-6'>
          <div className='flex items-center space-x-4'>
            <Skeleton className='h-10 w-10' />
            <div className='space-y-2'>
              <Skeleton className='h-8 w-64' />
              <Skeleton className='h-4 w-96' />
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {Array.from({length: 3}).map((_, i) => (
              <Card key={i}>
                <CardContent className='p-6'>
                  <Skeleton className='h-20 w-full' />
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
      <div className='container mx-auto py-8'>
        <div className='text-center py-8'>
          <p className='text-destructive mb-4'>{error}</p>
          <div className='space-x-2'>
            <Button onClick={fetchIpKit}>Retry</Button>
            <Button variant='outline' onClick={() => router.push("/ip-kits")}>
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
    <div className='container mx-auto py-8 max-w-6xl space-y-8'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div className='flex items-center space-x-4'>
          <Link href='/ip-kits'>
            <Button variant='ghost' size='icon'>
              <ArrowLeft className='h-4 w-4' />
            </Button>
          </Link>
          <div className='space-y-2'>
            <div className='flex items-center space-x-3'>
              <h1 className='text-3xl font-bold'>{ipKit.name}</h1>
              <Badge
                className={cn(
                  "font-medium shadow-sm",
                  getIpKitStatusColor(ipKit.isPublished)
                )}
              >
                {ipKit.isPublished ? `Published v${ipKit.version}` : "Draft"}
              </Badge>
            </div>
            <p className='text-muted-foreground'>
              {ipKit.description || "No description provided"}
            </p>
            <div className='flex items-center space-x-4 text-sm text-muted-foreground'>
              <span>Brand: {ipKit.brandName}</span>
              <span>•</span>
              <span>Created: {formatDate(ipKit.createdAt)}</span>
              <span>•</span>
              <span>Last updated: {formatDate(ipKit.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            onClick={handlePublishToggle}
            className='hover:bg-orange-100 hover:border-orange-400 hover:text-orange-800 dark:hover:bg-orange-950/40 dark:hover:text-orange-200 transition-all'
          >
            {ipKit.isPublished ? (
              <Eye className='mr-2 h-4 w-4' />
            ) : (
              <Upload className='mr-2 h-4 w-4' />
            )}
            {ipKit.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Link href={`/ip-kits/${ipKit.id}/edit`}>
            <Button
              variant='outline'
              className='hover:bg-blue-100 hover:border-blue-400 hover:text-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-200 transition-all'
            >
              <Edit className='mr-2 h-4 w-4' />
              Edit
            </Button>
          </Link>
          <Button variant='gradient' className='shadow-lg'>
            <Share className='mr-2 h-4 w-4' />
            Share
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
        <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div className='space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Assets
                </p>
                <p className='text-3xl font-bold bg-gradient-to-br from-gradient-purple to-gradient-pink bg-clip-text text-transparent'>
                  {ipKit.assetCount}
                </p>
              </div>
              <div className='p-3 rounded-xl bg-gradient-to-br from-gradient-purple to-gradient-pink backdrop-blur-sm border border-white/20 shadow-lg'>
                <Package className='h-5 w-5 text-white' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div className='space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Campaigns
                </p>
                <p className='text-3xl font-bold bg-gradient-to-br from-green-500 to-emerald-500 bg-clip-text text-transparent'>
                  0
                </p>
              </div>
              <div className='p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 backdrop-blur-sm border border-white/20 shadow-lg'>
                <Eye className='h-5 w-5 text-white' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div className='space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Downloads
                </p>
                <p className='text-3xl font-bold bg-gradient-to-br from-gradient-blue to-gradient-cyan bg-clip-text text-transparent'>
                  0
                </p>
              </div>
              <div className='p-3 rounded-xl bg-gradient-to-br from-gradient-blue to-gradient-cyan backdrop-blur-sm border border-white/20 shadow-lg'>
                <Download className='h-5 w-5 text-white' />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div className='space-y-2'>
                <p className='text-sm font-medium text-muted-foreground'>
                  Version
                </p>
                <p className='text-3xl font-bold bg-gradient-to-br from-orange-500 to-red-500 bg-clip-text text-transparent'>
                  v{ipKit.version}
                </p>
              </div>
              <div className='p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 backdrop-blur-sm border border-white/20 shadow-lg'>
                <Calendar className='h-5 w-5 text-white' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='space-y-6'
      >
        <TabsList className='grid w-full grid-cols-4'>
          <TabsTrigger value='overview'>Overview</TabsTrigger>
          <TabsTrigger value='assets'>Assets ({ipKit.assetCount})</TabsTrigger>
          <TabsTrigger value='upload'>Upload</TabsTrigger>
          <TabsTrigger value='settings'>Settings</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-6'>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Guidelines */}
            <div className='lg:col-span-2'>
              <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
                <CardHeader>
                  <CardTitle>Creative Guidelines</CardTitle>
                  <CardDescription>
                    Instructions for creators using this IP kit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ipKit.guidelines ? (
                    <div className='prose prose-sm max-w-none'>
                      <p className='whitespace-pre-wrap'>{ipKit.guidelines}</p>
                    </div>
                  ) : (
                    <p className='text-muted-foreground italic'>
                      No guidelines provided yet. Consider adding guidelines to
                      help creators use your assets effectively.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Info Panel */}
            <div className='space-y-6'>
              <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
                <CardHeader>
                  <CardTitle>Information</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <p className='text-sm font-medium'>Status</p>
                    <p className='text-sm text-muted-foreground'>
                      {ipKit.isPublished
                        ? "Published and available to creators"
                        : "Draft - not visible to creators"}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm font-medium'>Version</p>
                    <p className='text-sm text-muted-foreground'>
                      v{ipKit.version}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm font-medium'>Brand</p>
                    <p className='text-sm text-muted-foreground'>
                      {ipKit.brandName}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm font-medium'>Created</p>
                    <p className='text-sm text-muted-foreground'>
                      {formatDate(ipKit.createdAt)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value='assets'>
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <CardTitle>Asset Library</CardTitle>
                  <CardDescription>
                    All assets included in this IP kit
                  </CardDescription>
                </div>
                <Button
                  variant='gradient'
                  onClick={() => setAddAssetsModalOpen(true)}
                >
                  <Plus className='mr-2 h-4 w-4' />
                  Add Assets
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <IpKitAssetGallery
                  ipKitId={ipKit.id}
                  assets={ipKit.assets}
                  onAssetRemovedFromIpKit={handleAssetRemovedFromIpKit}
                  className='mt-6'
                />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='upload' className='space-y-6'>
          {/* Modern Single Upload Zone with Category Selection */}
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
            <CardHeader>
              <CardTitle>Upload Assets to IP Kit</CardTitle>
              <CardDescription>
                Upload assets for this IP kit. Select the appropriate category
                and upload multiple files at once. You can change the category
                for different batches of uploads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <AssetUploadZone
                  ipKitId={ipKit.id}
                  categorySelectable={true}
                  onAssetsUploaded={handleAssetsUploaded}
                  maxFiles={20}
                  showIpIdInput={true}
                />
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Upload Tips */}
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
            <CardHeader>
              <CardTitle className='text-lg'>Upload Guidelines</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid md:grid-cols-2 gap-4 text-sm'>
                <div>
                  <h4 className='font-medium mb-2'>Asset Categories</h4>
                  <ul className='space-y-1 text-muted-foreground'>
                    <li>
                      • <strong>Characters:</strong> People, mascots, character
                      illustrations
                    </li>
                    <li>
                      • <strong>Backgrounds:</strong> Background images,
                      patterns, textures
                    </li>
                    <li>
                      • <strong>Logos:</strong> Brand logos, symbols, emblems
                    </li>
                    <li>
                      • <strong>Titles:</strong> Text graphics, typography
                      elements
                    </li>
                    <li>
                      • <strong>Props:</strong> Objects, items, decorative
                      elements
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className='font-medium mb-2'>Quality Guidelines</h4>
                  <ul className='space-y-1 text-muted-foreground'>
                    <li>• Use high-resolution images (min 300 DPI)</li>
                    <li>• Ensure proper lighting and contrast</li>
                    <li>• Remove backgrounds when appropriate</li>
                    <li>• Use consistent style across similar assets</li>
                    <li>• Include IP ID for blockchain tracking (optional)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='settings'>
          <Card className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/20'>
            <CardHeader>
              <CardTitle>IP Kit Settings</CardTitle>
              <CardDescription>
                Manage settings and advanced options for this IP kit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='font-medium'>Edit IP Kit</h4>
                    <p className='text-sm text-muted-foreground'>
                      Update basic information, guidelines, and settings
                    </p>
                  </div>
                  <Link href={`/ip-kits/${ipKit.id}/edit`}>
                    <Button
                      variant='outline'
                      className='hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all'
                    >
                      <Edit className='mr-2 h-4 w-4' />
                      Edit
                    </Button>
                  </Link>
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <h4 className='font-medium'>Publish Status</h4>
                    <p className='text-sm text-muted-foreground'>
                      {ipKit.isPublished
                        ? "This IP kit is live and available to creators"
                        : "This IP kit is a draft and not visible to creators"}
                    </p>
                  </div>
                  <Button
                    variant='outline'
                    onClick={handlePublishToggle}
                    className='hover:bg-secondary hover:border-secondary hover:text-secondary-foreground transition-all'
                  >
                    {ipKit.isPublished ? "Unpublish" : "Publish"}
                  </Button>
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
        existingAssetIds={ipKit.assets.map(asset => asset.id)}
      />
    </div>
  )
}
