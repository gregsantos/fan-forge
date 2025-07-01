"use client"

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Upload, 
  Image, 
  X, 
  Check, 
  AlertCircle,
  FileImage,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AssetCategory } from '@/types'
import { assetStorageService, AssetUploadProgress, AssetUploadOptions } from '@/lib/services/asset-storage'
import { ASSET_CATEGORIES, getCategoryInfo, BACKGROUND_ASSET_SPECS } from '@/lib/constants'

interface FileWithPreview extends File {
  preview?: string
  uploadProgress?: AssetUploadProgress
  uploadError?: string
  uploadResult?: any
}

interface AssetUploadZoneProps {
  ipKitId: string
  category?: AssetCategory
  categorySelectable?: boolean
  onCategoryChange?: (category: AssetCategory) => void
  onAssetsUploaded: (results: any[]) => void
  maxFiles?: number
  disabled?: boolean
  className?: string
  showIpIdInput?: boolean // Whether to show the IP ID input field
}

export function AssetUploadZone({
  ipKitId,
  category = 'other',
  categorySelectable = false,
  onCategoryChange,
  onAssetsUploaded,
  maxFiles = 10,
  disabled = false,
  className,
  showIpIdInput = false
}: AssetUploadZoneProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [ipId, setIpId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory>(category)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCategoryChange = (newCategory: AssetCategory) => {
    setSelectedCategory(newCategory)
    onCategoryChange?.(newCategory)
  }

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
      if (!validTypes.includes(file.type)) {
        console.warn(`Skipped ${file.name}: Invalid file type`)
        return false
      }

      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        console.warn(`Skipped ${file.name}: File too large`)
        return false
      }

      return true
    })

    const filesWithPreview = validFiles.map(file => {
      const fileWithPreview = file as FileWithPreview
      fileWithPreview.preview = URL.createObjectURL(file)
      return fileWithPreview
    })

    setFiles(prev => {
      const combined = [...prev, ...filesWithPreview]
      return combined.slice(0, maxFiles) // Respect maxFiles limit
    })
  }, [maxFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [disabled, addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      addFiles(selectedFiles)
    }
  }, [addFiles])

  

  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev]
      const file = newFiles[index]
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }, [])

  const uploadAssets = useCallback(async () => {
    if (files.length === 0 || isUploading) return

    setIsUploading(true)

    try {
      const uploadPromises = files.map((file, index) => {
        return assetStorageService.uploadAsset(file, {
          category: categorySelectable ? selectedCategory : category,
          ipKitId,
          ipId: ipId.trim() || undefined, // Include ipId if provided
          tags: [], // TODO: Add tag support
          onProgress: (progress) => {
            setFiles(prev => {
              const newFiles = [...prev]
              newFiles[index] = { ...newFiles[index], uploadProgress: progress }
              return newFiles
            })
          }
        }).then(result => {
          // Add the category that was used for this upload to the result
          const resultWithCategory = {
            ...result,
            category: categorySelectable ? selectedCategory : category
          }
          setFiles(prev => {
            const newFiles = [...prev]
            newFiles[index] = { ...newFiles[index], uploadResult: resultWithCategory }
            return newFiles
          })
          return resultWithCategory
        }).catch(error => {
          setFiles(prev => {
            const newFiles = [...prev]
            newFiles[index] = { ...newFiles[index], uploadError: error.message }
            return newFiles
          })
          throw error
        })
      })

      const results = await Promise.allSettled(uploadPromises)
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)

      if (successfulResults.length > 0) {
        onAssetsUploaded(successfulResults)
        
        // Clear successfully uploaded files
        setFiles(prev => prev.filter((_, index) => {
          const result = results[index]
          return result.status === 'rejected'
        }))
      }

    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setIsUploading(false)
    }
  }, [files, isUploading, category, categorySelectable, selectedCategory, ipKitId, onAssetsUploaded, ipId])

  const clearAll = useCallback(() => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    setFiles([])
  }, [files])

  const hasFiles = files.length > 0
  const canUpload = hasFiles && !isUploading && files.some(f => !f.uploadResult && !f.uploadError)

  // Get current category info for display
  const currentCategoryInfo = getCategoryInfo(categorySelectable ? selectedCategory : category)
  const showBackgroundGuidance = (categorySelectable ? selectedCategory : category) === 'backgrounds'

  return (
    <div className={cn("space-y-4", className)}>
      {/* Category Selection */}
      {categorySelectable && (
        <div className="space-y-2">
          <Label htmlFor="category-select-zone">Asset Category</Label>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger id="category-select-zone">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <currentCategoryInfo.icon className="h-4 w-4" />
                  {currentCategoryInfo.label}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ASSET_CATEGORIES.map((categoryInfo) => (
                <SelectItem key={categoryInfo.value} value={categoryInfo.value}>
                  <div className="flex items-center gap-2">
                    <categoryInfo.icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{categoryInfo.label}</div>
                      <div className="text-xs text-muted-foreground">{categoryInfo.description}</div>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {currentCategoryInfo.description}
          </p>
          
          {/* Background asset guidance */}
          {showBackgroundGuidance && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start gap-2">
                <currentCategoryInfo.icon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900 mb-1">Background Asset Guidelines</div>
                  <ul className="text-blue-800 space-y-1 text-xs">
                    <li>• <strong>Recommended:</strong> {BACKGROUND_ASSET_SPECS.recommended.idealWidth}×{BACKGROUND_ASSET_SPECS.recommended.idealHeight}px</li>
                    <li>• <strong>Minimum:</strong> {BACKGROUND_ASSET_SPECS.recommended.minWidth}×{BACKGROUND_ASSET_SPECS.recommended.minHeight}px</li>
                    <li>• <strong>Aspect Ratio:</strong> {BACKGROUND_ASSET_SPECS.recommended.aspectRatio} (matches canvas)</li>
                    <li>• Background assets will automatically fill the entire canvas</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IP ID Input (optional) */}
      {showIpIdInput && (
        <div className="space-y-2">
          <Label htmlFor="ipId">IP Address (Optional)</Label>
          <Input
            id="ipId"
            type="text"
            placeholder="e.g., 0xD52e1555a7Df6832300032fDc64dAf9a431b6C9f"
            value={ipId}
            onChange={(e) => setIpId(e.target.value)}
            disabled={disabled}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Optional blockchain address for IP identification
          </p>
        </div>
      )}

      {/* Upload Zone */}
      <Card 
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragOver && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed",
          !isDragOver && "border-muted-foreground/25 hover:border-muted-foreground/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              Upload {currentCategoryInfo.label.toLowerCase()} assets
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop your images here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PNG, JPG, SVG, WebP • Max 10MB per file • Up to {maxFiles} files
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* File Preview Grid */}
      {hasFiles && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Selected Files ({files.length})
            </h4>
            <div className="flex gap-2">
              {canUpload && (
                <Button onClick={uploadAssets} disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload Assets'}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardContent className="p-3">
                  {/* Preview Image */}
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileImage className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>

                  {/* Upload Progress */}
                  {file.uploadProgress && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {file.uploadProgress.message}
                        </span>
                        <span className="text-xs font-mono">
                          {file.uploadProgress.progress}%
                        </span>
                      </div>
                      <Progress value={file.uploadProgress.progress} className="h-1" />
                    </div>
                  )}

                  {/* Upload Status */}
                  {file.uploadResult && (
                    <div className="mt-2">
                      <Badge variant="default" className="bg-green-600">
                        <Check className="w-3 h-3 mr-1" />
                        Uploaded
                      </Badge>
                    </div>
                  )}

                  {file.uploadError && (
                    <div className="mt-2">
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Failed
                      </Badge>
                      <p className="text-xs text-destructive mt-1">
                        {file.uploadError}
                      </p>
                    </div>
                  )}

                  {/* Remove Button */}
                  {!file.uploadProgress && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 bg-background/80 hover:bg-background"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}