"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Plus,
  Image as ImageIcon,
  FileImage,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Asset } from "@/types"

interface AddAssetsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ipKitId: string
  onAssetsAdded: (addedAssets: Asset[]) => void
  existingAssetIds: string[] // Assets already in the IP kit
}

type SortOption = "newest" | "oldest" | "name" | "category"

export function AddAssetsModal({
  open,
  onOpenChange,
  ipKitId,
  onAssetsAdded,
  existingAssetIds,
}: AddAssetsModalProps) {
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [error, setError] = useState<string | null>(null)

  // Fetch available assets (excluding those already in the IP kit)
  const fetchAvailableAssets = useCallback(async () => {
    if (!open) return

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/assets?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }

      const data = await response.json()
      // Filter out assets already in this IP kit
      const filteredAssets = data.assets.filter(
        (asset: Asset) => !existingAssetIds.includes(asset.id)
      )
      setAvailableAssets(filteredAssets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets')
    } finally {
      setLoading(false)
    }
  }, [open, categoryFilter, searchQuery, existingAssetIds])

  useEffect(() => {
    fetchAvailableAssets()
  }, [fetchAvailableAssets])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setSelectedAssets([])
      setSearchQuery("")
      setCategoryFilter("all")
      setSortBy("newest")
      setError(null)
    }
  }, [open])

  // Filter and sort assets
  const filteredAssets = availableAssets
    .filter(asset => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !asset.originalFilename.toLowerCase().includes(query) &&
          !asset.tags.some(tag => tag.toLowerCase().includes(query))
        ) {
          return false
        }
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case "name":
          return a.originalFilename.localeCompare(b.originalFilename)
        case "category":
          return a.category.localeCompare(b.category)
        default:
          return 0
      }
    })

  const categories = Array.from(new Set(availableAssets.map(asset => asset.category)))

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    )
  }

  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([])
    } else {
      setSelectedAssets(filteredAssets.map(asset => asset.id))
    }
  }

  const handleAddAssets = async () => {
    if (selectedAssets.length === 0) return

    setAdding(true)
    try {
      const addedAssets: Asset[] = []
      
      // Add each selected asset to the IP kit
      for (const assetId of selectedAssets) {
        const response = await fetch(`/api/assets/${assetId}/ip-kits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ipKitId })
        })

        if (response.ok) {
          const asset = availableAssets.find(a => a.id === assetId)
          if (asset) {
            addedAssets.push(asset)
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error(`Failed to add asset ${assetId} to IP kit:`, response.status, errorData)
        }
      }

      if (addedAssets.length > 0) {
        onAssetsAdded(addedAssets)
        onOpenChange(false)
      } else {
        setError(`Failed to add ${selectedAssets.length} asset(s) to IP kit. Check console for details.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add assets')
    } finally {
      setAdding(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      characters: "bg-blue-100 text-blue-800",
      backgrounds: "bg-green-100 text-green-800",
      logos: "bg-purple-100 text-purple-800",
      titles: "bg-orange-100 text-orange-800",
      props: "bg-pink-100 text-pink-800",
      other: "bg-gray-100 text-gray-800",
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Add Assets to IP Kit</DialogTitle>
          <DialogDescription>
            Select assets from your brand&apos;s library to add to this IP kit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filters */}
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selection Controls */}
          {filteredAssets.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedAssets.length === filteredAssets.length}
                  onCheckedChange={handleSelectAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="cursor-pointer">
                  Select all ({filteredAssets.length} assets)
                </label>
              </div>
              <span className="text-muted-foreground">
                {selectedAssets.length} selected
              </span>
            </div>
          )}

          {/* Asset Grid */}
          <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading assets...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={fetchAvailableAssets} variant="outline">
                  Retry
                </Button>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8">
                <FileImage className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No assets available</h3>
                <p className="text-muted-foreground">
                  {searchQuery || categoryFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "All assets are already in this IP kit or upload some assets first"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAssets.map(asset => (
                  <Card 
                    key={asset.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md relative",
                      selectedAssets.includes(asset.id) && "ring-2 ring-primary"
                    )}
                    onClick={() => handleAssetToggle(asset.id)}
                  >
                    <CardContent className="p-3">
                      {/* Selection Checkbox */}
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedAssets.includes(asset.id)}
                          onChange={() => handleAssetToggle(asset.id)}
                          className="bg-white shadow-md"
                        />
                      </div>

                      {/* Asset Preview */}
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                        <img
                          src={asset.thumbnailUrl || asset.url}
                          alt={asset.originalFilename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full bg-muted flex flex-col items-center justify-center text-muted-foreground">
                                  <svg class="h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span class="text-xs">Image not found</span>
                                </div>
                              `
                            }
                          }}
                        />
                      </div>

                      {/* Asset Info */}
                      <div className="space-y-1">
                        <p 
                          className="text-xs font-medium truncate" 
                          title={asset.originalFilename}
                        >
                          {asset.originalFilename}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <Badge
                            className={getCategoryColor(asset.category)}
                            variant="secondary"
                          >
                            {asset.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(asset.metadata.fileSize)}
                          </span>
                        </div>

                        {asset.ipId && (
                          <p 
                            className="text-xs font-mono text-muted-foreground truncate" 
                            title={asset.ipId}
                          >
                            {asset.ipId}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddAssets}
            disabled={selectedAssets.length === 0 || adding}
          >
            {adding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add {selectedAssets.length} Asset{selectedAssets.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}