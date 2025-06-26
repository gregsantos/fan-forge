"use client"

import {useState} from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs"
import {FileUpload, UploadedFile} from "@/components/assets/file-upload"
import {AssetGrid} from "@/components/assets/asset-grid"
import {
  Upload,
  FolderOpen,
  Image,
  Palette,
  PersonStanding,
  Target,
  Squirrel,
} from "lucide-react"
import {ErrorBoundary} from "@/components/ui/error-boundary"

interface AssetsPageClientProps {
  initialStats: {
    totalAssets: number
    totalIpKits: number
    categoryBreakdown: Array<{category: string; count: number}>
    storageUsed: number
    storageLimit: number
  }
  availableIpKits: Array<{
    id: string
    title: string
    description?: string
  }>
}

export default function AssetsPageClient({
  initialStats,
  availableIpKits,
}: AssetsPageClientProps) {
  const [activeTab, setActiveTab] = useState("grid")
  const [uploadingFiles, setUploadingFiles] = useState<UploadedFile[]>([])
  const [selectedIpKitId, setSelectedIpKitId] = useState<string | null>(null)

  const handleFilesUploaded = async (files: UploadedFile[]) => {
    console.log("Files uploaded:", files)

    // Create asset records in the database
    for (const file of files) {
      if (file.status === "success" && file.url && file.metadata) {
        try {
          const response = await fetch("/api/assets", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
              filename: file.file.name,
              originalFilename: file.file.name,
              url: file.url,
              thumbnailUrl: file.thumbnailUrl,
              category: "other", // Default category - you might want to let users select this
              tags: [],
              metadata: file.metadata,
              ipId: file.ipId, // Include ipId if provided
              ipKitId: selectedIpKitId || undefined,
            }),
          })

          if (!response.ok) {
            console.error("Failed to create asset record")
          }
        } catch (error) {
          console.error("Error creating asset record:", error)
        }
      }
    }

    // Refresh the asset grid
    window.location.reload() // Simple refresh - in production you'd update state
  }

  const handleFilesRemoved = (fileIds: string[]) => {
    setUploadingFiles(prev => prev.filter(f => !fileIds.includes(f.id)))
  }

  const handleAssetDelete = async (assetId: string) => {
    try {
      // First attempt to delete
      const response = await fetch(`/api/assets/${assetId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Asset deleted successfully! ${result.details?.cleanedSubmissions ? `Cleaned ${result.details.cleanedSubmissions} submissions.` : ''}`)
        window.location.reload()
        return
      }

      if (response.status === 409) {
        // Asset is in use - show confirmation dialog
        const conflictData = await response.json()
        
        const confirmMessage = `This asset is currently in use:
        
${conflictData.details.activeCampaigns > 0 ? `• ${conflictData.details.activeCampaigns} active campaigns: ${conflictData.details.campaignNames?.join(', ') || 'Unknown'}` : ''}
${conflictData.details.affectedSubmissions > 0 ? `• ${conflictData.details.affectedSubmissions} submissions will be affected` : ''}

Deleting this asset will:
- Remove it from all IP kits
- Remove references from submissions
- Break any active campaigns using this asset

Are you sure you want to continue?`

        if (confirm(confirmMessage)) {
          // Force delete with confirmation
          const forceResponse = await fetch(`/api/assets/${assetId}?force=true`, {
            method: "DELETE",
          })
          
          if (forceResponse.ok) {
            const result = await forceResponse.json()
            alert(`Asset force-deleted successfully! ${result.details?.cleanedSubmissions ? `Cleaned ${result.details.cleanedSubmissions} submissions.` : ''}`)
            window.location.reload()
          } else {
            const errorData = await forceResponse.json()
            alert(`Failed to delete asset: ${errorData.error}`)
          }
        }
      } else {
        const errorData = await response.json()
        alert(`Failed to delete asset: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error deleting asset:", error)
      alert("Error deleting asset. Please try again.")
    }
  }

  // Calculate storage percentage
  const storagePercentage = Math.round(
    (initialStats.storageUsed / initialStats.storageLimit) * 100
  )
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Get category stats for display
  const getCategoryCount = (category: string) => {
    const found = initialStats.categoryBreakdown.find(
      c => c.category === category
    )
    return found ? found.count : 0
  }

  const stats = [
    {
      title: "Total Assets",
      value: initialStats.totalAssets.toString(),
      description: `Across ${initialStats.totalIpKits} IP kits`,
      icon: Image,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Logos",
      value: getCategoryCount("logos").toString(),
      description: "Logo assets",
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Characters",
      value: getCategoryCount("characters").toString(),
      description: "Character assets",
      icon: PersonStanding,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Backgrounds",
      value: getCategoryCount("backgrounds").toString(),
      description: "Background assets",
      icon: Palette,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Other",
      value: getCategoryCount("other").toString(),
      description: "Other assets",
      icon: Squirrel,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Storage Used",
      value: formatBytes(initialStats.storageUsed),
      description: `${storagePercentage}% of ${formatBytes(initialStats.storageLimit)}`,
      icon: Upload,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  return (
    <div className='container mx-auto py-8 space-y-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Asset Management</h1>
          <p className='text-muted-foreground mt-2'>
            Upload, organize, and manage your brand assets across all IP kits
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <ErrorBoundary>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4'>
          {stats.map(stat => (
            <Card key={stat.title}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stat.value}</div>
                <p className='text-xs text-muted-foreground'>
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ErrorBoundary>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='space-y-6'
      >
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger value='grid'>Asset Library</TabsTrigger>
          <TabsTrigger value='upload'>Upload Assets</TabsTrigger>
        </TabsList>

        <TabsContent value='upload' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Upload New Assets</CardTitle>
              <CardDescription>
                Add images, graphics, and other assets to your IP kit. Supported
                formats: JPEG, PNG, SVG. Maximum file size: 10MB.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <div className='space-y-4'>
                  {/* IP Kit Selection */}
                  <div>
                    <label className='block text-sm font-medium mb-2'>
                      IP Kit (Optional)
                    </label>
                    <select
                      value={selectedIpKitId || ""}
                      onChange={e => setSelectedIpKitId(e.target.value || null)}
                      className='w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                    >
                      <option value=''>No IP Kit (Global Assets)</option>
                      {availableIpKits.map(ipKit => (
                        <option key={ipKit.id} value={ipKit.id}>
                          {ipKit.title}
                        </option>
                      ))}
                    </select>
                    <p className='text-xs text-muted-foreground mt-1'>
                      Assets can be assigned to IP kits later if needed
                    </p>
                  </div>

                  <FileUpload
                    onFilesUploaded={handleFilesUploaded}
                    onFilesRemoved={handleFilesRemoved}
                    ipKitId={selectedIpKitId}
                    category='other'
                    maxFiles={20}
                    showIpIdInput={true}
                  />
                </div>
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Upload Tips */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Upload Tips</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid md:grid-cols-2 gap-4 text-sm'>
                <div>
                  <h4 className='font-medium mb-2'>File Organization</h4>
                  <ul className='space-y-1 text-muted-foreground'>
                    <li>• Use descriptive filenames</li>
                    <li>• Group similar assets together</li>
                    <li>• Add relevant tags for easy searching</li>
                  </ul>
                </div>
                <div>
                  <h4 className='font-medium mb-2'>Quality Guidelines</h4>
                  <ul className='space-y-1 text-muted-foreground'>
                    <li>• Use high-resolution images (min 300 DPI)</li>
                    <li>• Ensure proper lighting and contrast</li>
                    <li>• Remove backgrounds when appropriate</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='grid' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Asset Library</CardTitle>
              <CardDescription>
                Browse and manage all your uploaded assets across IP kits. Click
                on any asset to view details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <AssetGrid
                  onAssetDelete={handleAssetDelete}
                  availableIpKits={availableIpKits}
                  className='mt-6'
                />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
