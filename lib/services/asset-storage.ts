import { createClient } from '@/utils/supabase/client'
import { generateId } from '@/lib/utils'

export interface AssetUploadProgress {
  stage: 'preparing' | 'uploading_asset' | 'uploading_thumbnail' | 'complete' | 'error'
  progress: number // 0-100
  message: string
}

export interface AssetUploadResult {
  assetUrl: string
  thumbnailUrl: string
  ipId?: string // Include ipId in result if provided
  metadata: {
    width: number
    height: number
    fileSize: number
    mimeType: string
    colorPalette?: string[]
  }
}

export interface AssetUploadOptions {
  category: 'characters' | 'backgrounds' | 'logos' | 'titles' | 'props' | 'other'
  tags?: string[]
  ipId?: string // Optional blockchain address
  ipKitId: string
  onProgress?: (progress: AssetUploadProgress) => void
}

class AssetStorageService {
  private supabase = createClient()

  /**
   * Upload an asset file with automatic thumbnail generation
   */
  async uploadAsset(
    file: File,
    options: AssetUploadOptions
  ): Promise<AssetUploadResult> {
    const { category, tags = [], ipId, ipKitId, onProgress } = options
    
    try {
      // Validate file type
      if (!this.isValidAssetType(file)) {
        throw new Error(`Invalid file type: ${file.type}. Only images are allowed.`)
      }

      // Validate file size (10MB limit for assets)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 10MB.`)
      }

      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: 'Preparing asset upload...'
      })

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png'
      const assetId = generateId()
      const assetFilename = `${category}_${timestamp}_${assetId}.${fileExtension}`
      const thumbnailFilename = `${category}_${timestamp}_${assetId}_thumb.jpg`

      // Create asset path structure: ip-kits/{ipKitId}/{category}/
      const assetPath = `ip-kits/${ipKitId}/${category}/${assetFilename}`
      const thumbnailPath = `ip-kits/${ipKitId}/${category}/${thumbnailFilename}`

      // Get image metadata
      const metadata = await this.extractImageMetadata(file)

      onProgress?.({
        stage: 'uploading_asset',
        progress: 30,
        message: 'Uploading original asset...'
      })

      // Upload original asset
      const { data: assetData, error: assetError } = await this.supabase.storage
        .from('assets')
        .upload(assetPath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (assetError) {
        throw new Error(`Failed to upload asset: ${assetError.message}`)
      }

      onProgress?.({
        stage: 'uploading_thumbnail',
        progress: 60,
        message: 'Generating and uploading thumbnail...'
      })

      // Generate and upload thumbnail
      const thumbnailBlob = await this.generateThumbnail(file)
      const { data: thumbnailData, error: thumbnailError } = await this.supabase.storage
        .from('assets')
        .upload(thumbnailPath, thumbnailBlob, {
          cacheControl: '3600',
          upsert: false
        })

      if (thumbnailError) {
        // Clean up uploaded asset if thumbnail fails
        await this.supabase.storage.from('assets').remove([assetPath])
        throw new Error(`Failed to upload thumbnail: ${thumbnailError.message}`)
      }

      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Asset upload completed successfully!'
      })

      // Get public URLs
      const { data: { publicUrl: assetUrl } } = this.supabase.storage
        .from('assets')
        .getPublicUrl(assetPath)

      const { data: { publicUrl: thumbnailUrl } } = this.supabase.storage
        .from('assets')
        .getPublicUrl(thumbnailPath)

      return {
        assetUrl,
        thumbnailUrl,
        ipId, // Include ipId in result if provided
        metadata: {
          ...metadata,
          fileSize: file.size,
          mimeType: file.type
        }
      }

    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Upload failed'
      })
      throw error
    }
  }

  /**
   * Upload multiple assets with progress tracking
   */
  async uploadMultipleAssets(
    files: File[],
    options: Omit<AssetUploadOptions, 'onProgress'>,
    onProgress?: (fileIndex: number, fileProgress: AssetUploadProgress, overallProgress: number) => void
  ): Promise<AssetUploadResult[]> {
    const results: AssetUploadResult[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileProgress = (progress: AssetUploadProgress) => {
        const overallProgress = ((i * 100) + progress.progress) / files.length
        onProgress?.(i, progress, overallProgress)
      }

      try {
        const result = await this.uploadAsset(file, {
          ...options,
          onProgress: fileProgress
        })
        results.push(result)
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error)
        // Continue with other files
      }
    }

    return results
  }

  /**
   * Delete an asset and its thumbnail
   */
  async deleteAsset(assetUrl: string, thumbnailUrl?: string): Promise<void> {
    try {
      const assetPath = this.extractPathFromUrl(assetUrl)
      const filesToDelete = [assetPath]

      if (thumbnailUrl) {
        const thumbnailPath = this.extractPathFromUrl(thumbnailUrl)
        filesToDelete.push(thumbnailPath)
      }

      const { error } = await this.supabase.storage
        .from('assets')
        .remove(filesToDelete)

      if (error) {
        throw new Error(`Failed to delete asset: ${error.message}`)
      }
    } catch (error) {
      console.error('Error deleting asset:', error)
      throw error
    }
  }

  /**
   * Generate thumbnail from image file
   */
  private async generateThumbnail(file: File, maxSize: number = 300): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        // Calculate thumbnail dimensions maintaining aspect ratio
        const ratio = Math.min(maxSize / img.width, maxSize / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to generate thumbnail'))
            }
          },
          'image/jpeg',
          0.8 // 80% quality
        )
      }
      
      img.onerror = () => reject(new Error('Failed to load image for thumbnail generation'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Extract image metadata (dimensions, etc.)
   */
  private async extractImageMetadata(file: File): Promise<{ width: number; height: number; colorPalette?: string[] }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
          // TODO: Add color palette extraction if needed
        })
      }
      img.onerror = () => reject(new Error('Failed to load image metadata'))
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * Validate if file type is supported for assets
   */
  private isValidAssetType(file: File): boolean {
    const validTypes = [
      'image/jpeg',
      'image/png', 
      'image/svg+xml',
      'image/webp'
    ]
    return validTypes.includes(file.type)
  }

  /**
   * Extract file path from Supabase storage URL
   */
  private extractPathFromUrl(url: string): string {
    const urlParts = url.split('/storage/v1/object/public/assets/')
    return urlParts[1] || ''
  }

  /**
   * Get asset usage across campaigns
   */
  async getAssetUsage(assetId: string): Promise<{ campaignCount: number; campaigns: any[] }> {
    // TODO: Implement when we need to track asset usage across campaigns
    return { campaignCount: 0, campaigns: [] }
  }
}

export const assetStorageService = new AssetStorageService()