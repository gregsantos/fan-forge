"use client"

import {useState} from "react"
import {Card, CardContent} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Input} from "@/components/ui/input"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Search,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  Copy,
  Tag,
  Calendar,
  FileImage,
  Grid3x3,
  List,
} from "lucide-react"
import {cn, formatDate} from "@/lib/utils"
import {Asset} from "@/types"
import {assetStorageService} from "@/lib/services/asset-storage"

interface AssetGalleryProps {
  assets: Asset[]
  onAssetDeleted: (assetId: string) => void
  onAssetSelected?: (asset: Asset) => void
  className?: string
  selectionMode?: boolean
  selectedAssets?: string[]
}

type ViewMode = "grid" | "list"
type SortOption = "newest" | "oldest" | "name" | "size" | "category"

export function AssetGallery({
  assets,
  onAssetDeleted,
  onAssetSelected,
  className,
  selectionMode = false,
  selectedAssets = [],
}: AssetGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Filter and sort assets
  const filteredAssets = assets
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

      // Category filter
      if (categoryFilter !== "all" && asset.category !== categoryFilter) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        case "name":
          return a.originalFilename.localeCompare(b.originalFilename)
        case "size":
          return b.metadata.fileSize - a.metadata.fileSize
        case "category":
          return a.category.localeCompare(b.category)
        default:
          return 0
      }
    })

  const categories = Array.from(new Set(assets.map(asset => asset.category)))

  const handleAssetClick = (asset: Asset) => {
    if (selectionMode) {
      onAssetSelected?.(asset)
    } else {
      // Open asset in preview/detail view
      window.open(asset.url, "_blank")
    }
  }

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return

    setDeleting(true)
    try {
      // Delete from storage
      await assetStorageService.deleteAsset(
        assetToDelete.url,
        assetToDelete.thumbnailUrl
      )

      // Update parent component
      onAssetDeleted(assetToDelete.id)

      setDeleteDialogOpen(false)
      setAssetToDelete(null)
    } catch (error) {
      console.error("Failed to delete asset:", error)
      // TODO: Show error toast
    } finally {
      setDeleting(false)
    }
  }

  const downloadAsset = (asset: Asset) => {
    const link = document.createElement("a")
    link.href = asset.url
    link.download = asset.originalFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyAssetUrl = async (asset: Asset) => {
    try {
      await navigator.clipboard.writeText(asset.url)
      // TODO: Show success toast
    } catch (error) {
      console.error("Failed to copy URL:", error)
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
    <div className={cn("space-y-4", className)}>
      {/* Header with Search and Filters */}
      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <div className='flex flex-col sm:flex-row gap-2 flex-1'>
          {/* Search */}
          <div className='relative flex-1 max-w-sm'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search assets...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className='w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={value => setSortBy(value as SortOption)}
          >
            <SelectTrigger className='w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='newest'>Newest First</SelectItem>
              <SelectItem value='oldest'>Oldest First</SelectItem>
              <SelectItem value='name'>Name A-Z</SelectItem>
              <SelectItem value='size'>File Size</SelectItem>
              <SelectItem value='category'>Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className='flex gap-1 border rounded-md p-1'>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size='sm'
            onClick={() => setViewMode("grid")}
          >
            <Grid3x3 className='h-4 w-4' />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size='sm'
            onClick={() => setViewMode("list")}
          >
            <List className='h-4 w-4' />
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className='flex items-center justify-between text-sm text-muted-foreground'>
        <span>
          {filteredAssets.length} of {assets.length} assets
          {searchQuery && ` matching "${searchQuery}"`}
        </span>
      </div>

      {/* Asset Grid/List */}
      {filteredAssets.length === 0 ? (
        <div className='text-center py-12'>
          <FileImage className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
          <h3 className='text-lg font-medium mb-2'>No assets found</h3>
          <p className='text-muted-foreground'>
            {searchQuery || categoryFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Upload your first asset to get started"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'>
          {filteredAssets.map(asset => (
            <Card
              key={asset.id}
              className={cn(
                "group cursor-pointer transition-all hover:shadow-md",
                selectionMode &&
                  selectedAssets.includes(asset.id) &&
                  "ring-2 ring-primary"
              )}
              onClick={() => handleAssetClick(asset)}
            >
              <CardContent className='p-3'>
                {/* Asset Preview */}
                <div className='aspect-square rounded-lg overflow-hidden bg-muted mb-2 relative'>
                  <img
                    src={asset.thumbnailUrl || asset.url}
                    alt={asset.originalFilename}
                    className='w-full h-full object-cover'
                  />

                  {/* Overlay with actions */}
                  <div className='absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100'>
                    <div className='flex gap-1'>
                      <Button
                        size='icon'
                        variant='secondary'
                        className='h-8 w-8'
                      >
                        <Eye className='h-4 w-4' />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size='icon'
                            variant='secondary'
                            className='h-8 w-8'
                          >
                            <MoreVertical className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation()
                              downloadAsset(asset)
                            }}
                          >
                            <Download className='mr-2 h-4 w-4' />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation()
                              copyAssetUrl(asset)
                            }}
                          >
                            <Copy className='mr-2 h-4 w-4' />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className='text-destructive'
                            onClick={e => {
                              e.stopPropagation()
                              setAssetToDelete(asset)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Asset Info */}
                <div className='space-y-1'>
                  <p
                    className='text-xs font-medium truncate'
                    title={asset.originalFilename}
                  >
                    {asset.originalFilename}
                  </p>

                  <div className='flex items-center justify-between'>
                    <Badge
                      className={getCategoryColor(asset.category)}
                      variant='secondary'
                    >
                      {asset.category}
                    </Badge>
                    <span className='text-xs text-muted-foreground'>
                      {formatFileSize(asset.metadata.fileSize)}
                    </span>
                  </div>

                  {asset.tags.length > 0 && (
                    <div className='flex flex-wrap gap-1'>
                      {asset.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant='outline' className='text-xs'>
                          {tag}
                        </Badge>
                      ))}
                      {asset.tags.length > 2 && (
                        <Badge variant='outline' className='text-xs'>
                          +{asset.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className='space-y-2'>
          {filteredAssets.map(asset => (
            <Card
              key={asset.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-sm",
                selectionMode &&
                  selectedAssets.includes(asset.id) &&
                  "ring-2 ring-primary"
              )}
              onClick={() => handleAssetClick(asset)}
            >
              <CardContent className='p-4'>
                <div className='flex items-center gap-4'>
                  {/* Thumbnail */}
                  <div className='w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0'>
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt={asset.originalFilename}
                      className='w-full h-full object-cover'
                    />
                  </div>

                  {/* Asset Details */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-start justify-between'>
                      <div className='min-w-0 flex-1'>
                        <h4 className='font-medium truncate'>
                          {asset.originalFilename}
                        </h4>
                        <div className='flex items-center gap-2 mt-1'>
                          <Badge
                            className={getCategoryColor(asset.category)}
                            variant='secondary'
                          >
                            {asset.category}
                          </Badge>
                          <span className='text-sm text-muted-foreground'>
                            {asset.metadata.width} × {asset.metadata.height}
                          </span>
                          <span className='text-sm text-muted-foreground'>
                            {formatFileSize(asset.metadata.fileSize)}
                          </span>
                        </div>

                        {asset.tags.length > 0 && (
                          <div className='flex flex-wrap gap-1 mt-2'>
                            {asset.tags.map(tag => (
                              <Badge
                                key={tag}
                                variant='outline'
                                className='text-xs'
                              >
                                <Tag className='w-2 h-2 mr-1' />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className='flex items-center gap-1 mt-1 text-xs text-muted-foreground'>
                          <Calendar className='w-3 h-3' />
                          {formatDate(new Date(asset.createdAt))}
                        </div>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon'>
                            <MoreVertical className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation()
                              window.open(asset.url, "_blank")
                            }}
                          >
                            <Eye className='mr-2 h-4 w-4' />
                            View Full Size
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation()
                              downloadAsset(asset)
                            }}
                          >
                            <Download className='mr-2 h-4 w-4' />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={e => {
                              e.stopPropagation()
                              copyAssetUrl(asset)
                            }}
                          >
                            <Copy className='mr-2 h-4 w-4' />
                            Copy URL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className='text-destructive'
                            onClick={e => {
                              e.stopPropagation()
                              setAssetToDelete(asset)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {assetToDelete?.originalFilename}&quot;? This action cannot be
              undone and the asset will be permanently removed from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAsset}
              disabled={deleting}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deleting ? "Deleting..." : "Delete Asset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
