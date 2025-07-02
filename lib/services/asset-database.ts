import { AssetCategory } from '@/types'

export interface AssetDatabaseRecord {
  filename: string
  originalFilename: string
  url: string
  thumbnailUrl?: string
  category: AssetCategory
  tags?: string[]
  metadata: {
    width: number
    height: number
    fileSize: number
    mimeType: string
    colorPalette?: string[]
  }
  ipId?: string
  ipKitId?: string | null
  campaignId?: string
}

export interface UploadResult {
  assetUrl: string
  thumbnailUrl?: string
  category?: AssetCategory
  ipId?: string
  metadata: {
    width: number
    height: number
    fileSize: number
    mimeType: string
    colorPalette?: string[]
  }
}

export interface FileUploadResult {
  id: string
  file: File
  url?: string
  thumbnailUrl?: string
  category?: AssetCategory
  ipId?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  metadata?: {
    width: number
    height: number
    fileSize: number
    mimeType: string
    colorPalette?: string[]
  }
}

/**
 * Creates asset database records for successfully uploaded files
 */
export async function createAssetRecords(
  uploadResults: (UploadResult | FileUploadResult)[],
  options: {
    ipKitId?: string | null
    campaignId?: string
    defaultCategory?: AssetCategory
  } = {}
): Promise<{ success: number; failed: number; errors: string[] }> {
  const { ipKitId, campaignId, defaultCategory = 'other' } = options
  
  let successCount = 0
  let failedCount = 0
  const errors: string[] = []

  for (const result of uploadResults) {
    try {
      // Skip failed uploads
      if ('status' in result && result.status !== 'success') {
        continue
      }

      // Skip uploads without required data
      const url = 'assetUrl' in result ? result.assetUrl : result.url
      const metadata = result.metadata
      
      if (!url || !metadata) {
        failedCount++
        errors.push('Missing required upload data (url or metadata)')
        continue
      }

      // Extract filename from URL or use file name
      const filename = 'file' in result 
        ? result.file.name 
        : result.assetUrl?.split('/').pop() || 'asset'

      // Prepare database record
      const assetRecord: AssetDatabaseRecord = {
        filename,
        originalFilename: filename,
        url,
        thumbnailUrl: result.thumbnailUrl,
        category: result.category || defaultCategory,
        tags: [],
        metadata,
        ipId: result.ipId,
        ipKitId,
        campaignId
      }

      // Create database record
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetRecord)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      successCount++

    } catch (error) {
      failedCount++
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Failed to create asset record: ${errorMessage}`)
      console.error('Error creating asset record:', error)
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    errors
  }
}

/**
 * Handles the complete upload workflow: upload files + create database records
 * This is a higher-level function that upload components can use
 */
export async function handleAssetUploadComplete(
  uploadResults: (UploadResult | FileUploadResult)[],
  options: {
    ipKitId?: string | null
    campaignId?: string
    defaultCategory?: AssetCategory
    onProgress?: (completed: number, total: number) => void
    onComplete?: (result: { success: number; failed: number; errors: string[] }) => void
  } = {}
): Promise<{ success: number; failed: number; errors: string[] }> {
  const { onProgress, onComplete, ...createOptions } = options
  
  // Filter to only successful uploads
  const successfulUploads = uploadResults.filter(result => {
    if ('status' in result) {
      return result.status === 'success' && result.url && result.metadata
    }
    return result.assetUrl && result.metadata
  })

  onProgress?.(0, successfulUploads.length)

  // Create database records
  const result = await createAssetRecords(successfulUploads, createOptions)
  
  onProgress?.(result.success + result.failed, successfulUploads.length)
  onComplete?.(result)

  return result
}