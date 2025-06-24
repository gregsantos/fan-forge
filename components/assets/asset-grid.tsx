"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Download, 
  Trash2, 
  Eye, 
  Copy,
  FileImage,
  File
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface Asset {
  id: string
  filename: string
  originalFilename: string
  url: string
  thumbnailUrl?: string
  category: 'characters' | 'backgrounds' | 'logos' | 'titles' | 'props' | 'other'
  tags: string[]
  metadata: {
    width: number
    height: number
    fileSize: number
    mimeType: string
    colorPalette?: string[]
  }
  ipId?: string // Optional blockchain address
  ipKitId: string
  uploadedBy?: string
  createdAt: string
}

interface AssetGridProps {
  ipKitId?: string
  onAssetSelect?: (asset: Asset) => void
  onAssetDelete?: (assetId: string) => void
  selectable?: boolean
  selectedAssets?: string[]
  className?: string
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'characters', label: 'Characters' },
  { value: 'backgrounds', label: 'Backgrounds' },
  { value: 'logos', label: 'Logos' },
  { value: 'titles', label: 'Titles' },
  { value: 'props', label: 'Props' },
  { value: 'other', label: 'Other' }
]

export function AssetGrid({ 
  ipKitId, 
  onAssetSelect, 
  onAssetDelete, 
  selectable = false,
  selectedAssets = [],
  className 
}: AssetGridProps) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [error, setError] = useState<string | null>(null)

  const fetchAssets = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (ipKitId) params.append('ipKitId', ipKitId)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/assets?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }

      const data = await response.json()
      setAssets(data.assets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssets()
  }, [ipKitId, selectedCategory, searchQuery])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-8 w-8" />
    }
    return <File className="h-8 w-8" />
  }

  const handleAssetClick = (asset: Asset) => {
    if (selectable && onAssetSelect) {
      onAssetSelect(asset)
    }
  }

  const handleDownload = async (asset: Asset) => {
    try {
      const response = await fetch(asset.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = asset.originalFilename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      // You might want to show a toast notification here
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error}</p>
        <Button onClick={fetchAssets} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="aspect-square">
              <CardContent className="p-0">
                <Skeleton className="w-full h-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12">
          <FileImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No assets found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Upload some assets to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {assets.map((asset) => (
            <Card 
              key={asset.id} 
              className={cn(
                "group relative aspect-square overflow-hidden transition-all hover:shadow-md",
                selectable && "cursor-pointer hover:ring-2 hover:ring-primary",
                selectedAssets.includes(asset.id) && "ring-2 ring-primary"
              )}
              onClick={() => handleAssetClick(asset)}
            >
              <CardContent className="p-0 h-full">
                {/* Asset Preview */}
                <div className="relative h-full">
                  {asset.thumbnailUrl || asset.metadata.mimeType.startsWith('image/') ? (
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.originalFilename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      {getFileIcon(asset.metadata.mimeType)}
                    </div>
                  )}

                  {/* Overlay with info */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-end">
                    <div className="w-full p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-sm font-medium truncate mb-1">
                        {asset.originalFilename}
                      </p>
                      {asset.ipId && (
                        <p className="text-xs font-mono text-gray-300 truncate mb-1" title={asset.ipId}>
                          {asset.ipId}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span>{asset.metadata.width}×{asset.metadata.height}</span>
                        <span>{formatFileSize(asset.metadata.fileSize)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 capitalize"
                  >
                    {asset.category}
                  </Badge>

                  {/* Actions Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-black/70 text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.open(asset.url, '_blank')}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Full Size
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(asset)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyUrl(asset.url)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy URL
                      </DropdownMenuItem>
                      {asset.ipId && (
                        <DropdownMenuItem onClick={() => handleCopyUrl(asset.ipId!)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy IP ID
                        </DropdownMenuItem>
                      )}
                      {onAssetDelete && (
                        <DropdownMenuItem 
                          onClick={() => onAssetDelete(asset.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>

              {/* Tags */}
              {asset.tags.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex flex-wrap gap-1">
                    {asset.tags.slice(0, 2).map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className="text-xs bg-black/50 text-white border-white/30"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {asset.tags.length > 2 && (
                      <Badge 
                        variant="outline" 
                        className="text-xs bg-black/50 text-white border-white/30"
                      >
                        +{asset.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}