"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Package, 
  Image, 
  Eye, 
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IPKit {
  id: string
  name: string
  description?: string
  brandName: string
  assetCount: number
  isPublished: boolean
  version: number
  createdAt: string
  updatedAt: string
}

interface AssetBreakdown {
  characters: number
  backgrounds: number
  logos: number
  titles: number
  props: number
  other: number
}

interface IPKitSelectorProps {
  selectedIpKitId?: string
  onSelect: (ipKitId: string) => void
  className?: string
  showPreview?: boolean
  brandId?: string
}

export function IPKitSelector({
  selectedIpKitId,
  onSelect,
  className,
  showPreview = true,
  brandId
}: IPKitSelectorProps) {
  const [ipKits, setIpKits] = useState<IPKit[]>([])
  const [selectedKit, setSelectedKit] = useState<IPKit | null>(null)
  const [assetBreakdown, setAssetBreakdown] = useState<AssetBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch available IP kits
  useEffect(() => {
    const fetchIpKits = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (brandId) params.append('brandId', brandId)
        params.append('published', 'true') // Only show published IP kits for campaigns

        const response = await fetch(`/api/ip-kits?${params}`)
        if (!response.ok) {
          throw new Error('Failed to fetch IP kits')
        }

        const data = await response.json()
        setIpKits(data.ipKits || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load IP kits')
      } finally {
        setLoading(false)
      }
    }

    fetchIpKits()
  }, [brandId])

  // Fetch selected IP kit details
  useEffect(() => {
    if (!selectedIpKitId) {
      setSelectedKit(null)
      setAssetBreakdown(null)
      return
    }

    const kit = ipKits.find(k => k.id === selectedIpKitId)
    if (kit) {
      setSelectedKit(kit)
      fetchAssetBreakdown(selectedIpKitId)
    }
  }, [selectedIpKitId, ipKits])

  const fetchAssetBreakdown = async (ipKitId: string) => {
    try {
      setPreviewLoading(true)
      const response = await fetch(`/api/ip-kits/${ipKitId}/assets?limit=1`) // Just get metadata
      if (response.ok) {
        const data = await response.json()
        setAssetBreakdown(data.categoryBreakdown)
      }
    } catch (error) {
      console.error('Failed to fetch asset breakdown:', error)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSelect = (ipKitId: string) => {
    onSelect(ipKitId)
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
        {showPreview && (
          <Skeleton className="h-32 w-full" />
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="text-center py-6">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-destructive">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* IP Kit Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">IP Kit</label>
          {ipKits.length === 0 && (
            <span className="text-xs text-muted-foreground">No published IP kits available</span>
          )}
        </div>
        
        <Select 
          value={selectedIpKitId || ""} 
          onValueChange={handleSelect}
          disabled={ipKits.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={
              ipKits.length === 0 
                ? "No IP kits available" 
                : "Select an IP kit for this campaign..."
            } />
          </SelectTrigger>
          <SelectContent>
            {ipKits.map((kit) => (
              <SelectItem key={kit.id} value={kit.id}>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{kit.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      v{kit.version}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {kit.brandName} • {kit.assetCount} assets
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* IP Kit Preview */}
      {showPreview && selectedKit && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{selectedKit.name}</CardTitle>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Published
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.open(`/ip-kits/${selectedKit.id}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            {selectedKit.description && (
              <CardDescription className="text-sm">
                {selectedKit.description}
              </CardDescription>
            )}
          </CardHeader>
          
          <CardContent className="pt-0 space-y-3">
            {/* Asset Summary */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Assets</span>
              </div>
              <span className="text-sm font-mono">{selectedKit.assetCount}</span>
            </div>

            {/* Asset Breakdown */}
            {previewLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ) : assetBreakdown ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Asset Categories</p>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(assetBreakdown).map(([category, count]) => (
                    <div 
                      key={category}
                      className="flex items-center justify-between p-2 bg-background border rounded text-xs"
                    >
                      <span className="capitalize">{category}</span>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t">
              <div>
                <span className="font-medium">Brand:</span> {selectedKit.brandName}
              </div>
              <div>
                <span className="font-medium">Version:</span> v{selectedKit.version}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {ipKits.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-6 text-center">
            <Package className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No IP Kits Available</p>
            <p className="text-xs text-muted-foreground mb-3">
              You need to create and publish an IP Kit before creating campaigns.
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('/ip-kits/new', '_blank')}
            >
              Create IP Kit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}