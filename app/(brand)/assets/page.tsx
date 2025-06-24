"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { FileUpload, UploadedFile } from "@/components/assets/file-upload"
import { AssetGrid, Asset } from "@/components/assets/asset-grid"
import { Upload, FolderOpen, Image, Palette } from "lucide-react"
import { ErrorBoundary } from "@/components/ui/error-boundary"

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState("grid")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [uploadingFiles, setUploadingFiles] = useState<UploadedFile[]>([])

  // Mock IP Kit ID - in production this would come from context or selection
  const mockIpKitId = "550e8400-e29b-41d4-a716-446655440000"

  const handleFilesUploaded = async (files: UploadedFile[]) => {
    console.log('Files uploaded:', files)
    
    // Create asset records in the database
    for (const file of files) {
      if (file.status === 'success' && file.url && file.metadata) {
        try {
          const response = await fetch('/api/assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.file.name,
              originalFilename: file.file.name,
              url: file.url,
              thumbnailUrl: file.thumbnailUrl,
              category: 'other', // Default category - you might want to let users select this
              tags: [],
              metadata: file.metadata,
              ipId: file.ipId, // Include ipId if provided
              ipKitId: mockIpKitId
            })
          })

          if (!response.ok) {
            console.error('Failed to create asset record')
          }
        } catch (error) {
          console.error('Error creating asset record:', error)
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
    if (confirm('Are you sure you want to delete this asset?')) {
      try {
        const response = await fetch(`/api/assets/${assetId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          // Refresh the asset grid
          window.location.reload() // Simple refresh - in production you'd update state
        } else {
          console.error('Failed to delete asset')
        }
      } catch (error) {
        console.error('Error deleting asset:', error)
      }
    }
  }

  const stats = [
    {
      title: "Total Assets",
      value: "247",
      description: "Across all IP kits",
      icon: Image,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Characters",
      value: "89",
      description: "Character assets",
      icon: Palette,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Backgrounds",
      value: "76",
      description: "Background assets",
      icon: FolderOpen,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "Storage Used",
      value: "2.4 GB",
      description: "of 10 GB limit",
      icon: Upload,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ]

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Asset Management</h1>
          <p className="text-muted-foreground mt-2">
            Upload, organize, and manage your brand assets
          </p>
        </div>
        <Badge variant="outline" className="ml-auto">
          Beta
        </Badge>
      </div>

      {/* Stats Cards */}
      <ErrorBoundary>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ErrorBoundary>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="grid">Asset Library</TabsTrigger>
          <TabsTrigger value="upload">Upload Assets</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Assets</CardTitle>
              <CardDescription>
                Add images, graphics, and other assets to your IP kit. 
                Supported formats: JPEG, PNG, SVG. Maximum file size: 10MB.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <FileUpload
                  onFilesUploaded={handleFilesUploaded}
                  onFilesRemoved={handleFilesRemoved}
                  ipKitId={mockIpKitId}
                  category="other"
                  maxFiles={20}
                  showIpIdInput={true}
                />
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Upload Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">File Organization</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Use descriptive filenames</li>
                    <li>• Group similar assets together</li>
                    <li>• Add relevant tags for easy searching</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Quality Guidelines</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Use high-resolution images (min 300 DPI)</li>
                    <li>• Ensure proper lighting and contrast</li>
                    <li>• Remove backgrounds when appropriate</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grid" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Library</CardTitle>
              <CardDescription>
                Browse and manage your uploaded assets. Click on any asset to view details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ErrorBoundary>
                <AssetGrid
                  ipKitId={mockIpKitId}
                  onAssetDelete={handleAssetDelete}
                  className="mt-6"
                />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}