import { CanvasElement } from '@/types'

export interface AssetUsageInfo {
  assetId: string
  count: number
  transformations: {
    x: number
    y: number
    width: number
    height: number
    rotation: number
    opacity?: number
  }[]
}

export interface CanvasAssetSummary {
  usedAssetIds: string[]
  assetUsageInfo: AssetUsageInfo[]
  ipKitId?: string
  totalElements: number
  assetElements: number
  textElements: number
}

export const canvasAssetTracker = {
  /**
   * Extract all asset IDs used in canvas elements
   */
  getUsedAssetIds(elements: CanvasElement[]): string[] {
    const assetIds = elements
      .filter(element => element.type === 'asset' && element.assetId)
      .map(element => element.assetId!)
    
    // Return unique asset IDs
    return Array.from(new Set(assetIds))
  },

  /**
   * Get detailed usage information for each asset
   */
  getAssetUsageInfo(elements: CanvasElement[]): AssetUsageInfo[] {
    const usageMap = new Map<string, AssetUsageInfo>()

    elements
      .filter(element => element.type === 'asset' && element.assetId)
      .forEach(element => {
        const assetId = element.assetId!
        
        if (!usageMap.has(assetId)) {
          usageMap.set(assetId, {
            assetId,
            count: 0,
            transformations: []
          })
        }

        const info = usageMap.get(assetId)!
        info.count++
        info.transformations.push({
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          rotation: element.rotation,
          opacity: element.opacity
        })
      })

    return Array.from(usageMap.values())
  },

  /**
   * Get comprehensive canvas asset summary
   */
  getCanvasAssetSummary(elements: CanvasElement[], ipKitId?: string): CanvasAssetSummary {
    const usedAssetIds = this.getUsedAssetIds(elements)
    const assetUsageInfo = this.getAssetUsageInfo(elements)
    
    const assetElements = elements.filter(el => el.type === 'asset').length
    const textElements = elements.filter(el => el.type === 'text').length

    return {
      usedAssetIds,
      assetUsageInfo,
      ipKitId,
      totalElements: elements.length,
      assetElements,
      textElements
    }
  },

  /**
   * Validate canvas composition before submission (client-side checks only)
   */
  validateCanvasComposition(elements: CanvasElement[], ipKitId: string): {
    valid: boolean
    errors: string[]
    warnings: string[]
    summary: CanvasAssetSummary
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Get canvas summary
    const summary = this.getCanvasAssetSummary(elements, ipKitId)

    // Check if canvas has any elements
    if (elements.length === 0) {
      errors.push('Canvas must contain at least one element')
      return { valid: false, errors, warnings, summary }
    }

    // Check for text elements without content
    const emptyTextElements = elements.filter(el => 
      el.type === 'text' && (!el.text || el.text.trim() === '')
    )
    if (emptyTextElements.length > 0) {
      warnings.push(`${emptyTextElements.length} text element(s) have no content`)
    }

    // Check for very small elements that might not be visible
    const tinyElements = elements.filter(el => el.width < 10 || el.height < 10)
    if (tinyElements.length > 0) {
      warnings.push(`${tinyElements.length} element(s) are very small and may not be visible`)
    }

    // Check for elements positioned outside canvas bounds
    const canvasWidth = 800
    const canvasHeight = 600
    const outsideElements = elements.filter(el => 
      el.x < 0 || el.y < 0 || 
      el.x + el.width > canvasWidth || 
      el.y + el.height > canvasHeight
    )
    if (outsideElements.length > 0) {
      warnings.push(`${outsideElements.length} element(s) extend outside canvas bounds`)
    }

    const valid = errors.length === 0

    return {
      valid,
      errors,
      warnings,
      summary
    }
  },

  /**
   * Generate metadata for submission tracking
   */
  generateSubmissionMetadata(elements: CanvasElement[], ipKitId: string) {
    const summary = this.getCanvasAssetSummary(elements, ipKitId)
    
    return {
      canvasData: {
        elements,
        canvasSize: { width: 800, height: 600 },
        version: "1.0"
      },
      assetMetadata: {
        usedAssetIds: summary.usedAssetIds,
        assetUsageInfo: summary.assetUsageInfo,
        ipKitId: summary.ipKitId,
        elementCounts: {
          total: summary.totalElements,
          assets: summary.assetElements,
          text: summary.textElements
        }
      }
    }
  },

  /**
   * Track asset usage statistics (for analytics) - client-side logging only
   */
  trackAssetUsage(submissionId: string, assetIds: string[]): void {
    // This is a placeholder for future analytics tracking
    // Could be implemented to update asset usage statistics in the database
    console.log(`Tracking asset usage for submission ${submissionId}:`, assetIds)
  }
}