import { db, assets } from '@/db'
import { eq, inArray } from 'drizzle-orm'
import { Asset } from '@/types'

/**
 * Server-side asset validation and database operations
 * This file should only be imported in server components or API routes
 */

export interface AssetValidationResult {
  valid: boolean
  invalidAssets: string[]
  missingAssets: string[]
}

/**
 * Validate that all used assets belong to the specified IP Kit
 */
export async function validateAssetAccess(assetIds: string[], ipKitId: string): Promise<AssetValidationResult> {
  if (assetIds.length === 0) {
    return { valid: true, invalidAssets: [], missingAssets: [] }
  }

  try {
    // Query assets from database
    const dbAssets = await db
      .select({
        id: assets.id,
        ipKitId: assets.ipKitId
      })
      .from(assets)
      .where(inArray(assets.id, assetIds))

    const foundAssetIds = dbAssets.map(asset => asset.id)
    const missingAssets = assetIds.filter(id => !foundAssetIds.includes(id))
    
    const invalidAssets = dbAssets
      .filter(asset => asset.ipKitId !== ipKitId)
      .map(asset => asset.id)

    const valid = missingAssets.length === 0 && invalidAssets.length === 0

    return {
      valid,
      invalidAssets,
      missingAssets
    }
  } catch (error) {
    console.error('Failed to validate asset access:', error)
    throw new Error('Failed to validate asset access')
  }
}

/**
 * Get detailed information about assets used in canvas
 */
export async function getAssetDetails(assetIds: string[]): Promise<Asset[]> {
  if (assetIds.length === 0) {
    return []
  }

  try {
    const dbAssets = await db
      .select()
      .from(assets)
      .where(inArray(assets.id, assetIds))

    return dbAssets.map(asset => ({
      ...asset,
      thumbnailUrl: asset.thumbnailUrl || undefined,
      tags: asset.tags || [],
      uploadedBy: asset.uploadedBy || undefined
    }))
  } catch (error) {
    console.error('Failed to get asset details:', error)
    throw new Error('Failed to get asset details')
  }
}

/**
 * Track asset usage statistics in database (for analytics)
 */
export async function trackAssetUsage(submissionId: string, assetIds: string[]): Promise<void> {
  // This is a placeholder for future analytics tracking
  // Could be implemented to update asset usage statistics in the database
  console.log(`Tracking asset usage for submission ${submissionId}:`, assetIds)
  
  // Future implementation could include:
  // - Incrementing usage counters for each asset
  // - Recording submission-to-asset relationships
  // - Tracking usage patterns for recommendations
}