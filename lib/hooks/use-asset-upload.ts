import { useState, useCallback } from 'react'
import { handleAssetUploadComplete, UploadResult, FileUploadResult } from '@/lib/services/asset-database'
import { AssetCategory } from '@/types'

interface UseAssetUploadOptions {
  ipKitId?: string | null
  campaignId?: string
  defaultCategory?: AssetCategory
  onSuccess?: (result: { success: number; failed: number }) => void
  onError?: (errors: string[]) => void
  onRefresh?: () => void
}

export function useAssetUpload(options: UseAssetUploadOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  const handleUpload = useCallback(async (uploadResults: (UploadResult | FileUploadResult)[]) => {
    setIsProcessing(true)
    
    try {
      const result = await handleAssetUploadComplete(uploadResults, {
        ipKitId: options.ipKitId,
        campaignId: options.campaignId,
        defaultCategory: options.defaultCategory,
        onComplete: (result) => {
          if (result.failed > 0) {
            console.error(`${result.failed} assets failed to create database records:`, result.errors)
            options.onError?.(result.errors)
          }
          
          if (result.success > 0) {
            console.log(`Successfully created ${result.success} asset records`)
            options.onSuccess?.(result)
          }
          
          setLastResult(result)
        }
      })

      // Trigger refresh if provided
      options.onRefresh?.()
      
      return result
    } finally {
      setIsProcessing(false)
    }
  }, [options])

  return {
    handleUpload,
    isProcessing,
    lastResult
  }
}