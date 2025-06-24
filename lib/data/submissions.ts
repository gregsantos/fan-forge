import { db, submissions, submissionAssets, assets } from '@/db'
import { eq, and, isNotNull, count } from 'drizzle-orm'

/**
 * Shared data functions for submissions
 * Following Next.js App Router best practices for server-side data fetching
 */

/**
 * Get all unique IP IDs for assets used in a submission
 * This function efficiently retrieves IP IDs via the junction table approach
 * for external service integration when submissions are approved
 */
export async function getSubmissionAssetIpIds(submissionId: string): Promise<string[]> {
  try {
    // Query submission assets with their associated IP IDs using junction table
    const results = await db
      .select({
        ipId: assets.ipId
      })
      .from(submissionAssets)
      .innerJoin(assets, eq(submissionAssets.assetId, assets.id))
      .where(
        and(
          eq(submissionAssets.submissionId, submissionId),
          isNotNull(assets.ipId)
        )
      )

    // Extract unique IP IDs, filtering out any null/undefined values
    const ipIds = results
      .map(result => result.ipId)
      .filter((ipId): ipId is string => ipId !== null && ipId !== undefined)
    
    // Return unique IP IDs
    return Array.from(new Set(ipIds))
  } catch (error) {
    console.error(`Failed to get IP IDs for submission ${submissionId}:`, error)
    throw new Error('Failed to retrieve submission asset IP IDs')
  }
}

/**
 * Get detailed asset information for a submission including IP IDs
 * Useful for comprehensive submission analysis and external service integration
 */
export async function getSubmissionAssetDetails(submissionId: string) {
  try {
    const results = await db
      .select({
        asset: {
          id: assets.id,
          filename: assets.filename,
          url: assets.url,
          category: assets.category,
          ipId: assets.ipId,
          ipKitId: assets.ipKitId
        },
        submissionAsset: {
          createdAt: submissionAssets.createdAt
        }
      })
      .from(submissionAssets)
      .innerJoin(assets, eq(submissionAssets.assetId, assets.id))
      .where(eq(submissionAssets.submissionId, submissionId))
      .orderBy(submissionAssets.createdAt)

    return results.map(result => ({
      ...result.asset,
      usedAt: result.submissionAsset.createdAt
    }))
  } catch (error) {
    console.error(`Failed to get asset details for submission ${submissionId}:`, error)
    throw new Error('Failed to retrieve submission asset details')
  }
}

/**
 * Validate that a submission exists and optionally check its status
 */
export async function validateSubmissionExists(submissionId: string, requiredStatus?: string) {
  try {
    const [submission] = await db
      .select({
        id: submissions.id,
        status: submissions.status,
        campaignId: submissions.campaignId,
        creatorId: submissions.creatorId
      })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (!submission) {
      throw new Error('Submission not found')
    }

    if (requiredStatus && submission.status !== requiredStatus) {
      throw new Error(`Submission status must be ${requiredStatus}, but is ${submission.status}`)
    }

    return submission
  } catch (error) {
    console.error(`Failed to validate submission ${submissionId}:`, error)
    throw error
  }
}

/**
 * Get submission statistics including asset usage
 * Useful for analytics and reporting
 */
export async function getSubmissionStats(submissionId: string) {
  try {
    // Get basic submission info
    const submission = await validateSubmissionExists(submissionId)
    
    // Get total asset count
    const [totalAssetsResult] = await db
      .select({
        count: count(submissionAssets.id)
      })
      .from(submissionAssets)
      .where(eq(submissionAssets.submissionId, submissionId))

    // Get asset breakdown by category
    const categoryBreakdown = await db
      .select({
        category: assets.category,
        count: count(assets.id)
      })
      .from(submissionAssets)
      .innerJoin(assets, eq(submissionAssets.assetId, assets.id))
      .where(eq(submissionAssets.submissionId, submissionId))
      .groupBy(assets.category)

    // Get unique IP IDs (this reuses our efficient function above)
    const ipIds = await getSubmissionAssetIpIds(submissionId)

    return {
      submission,
      stats: {
        totalAssets: totalAssetsResult?.count || 0,
        uniqueIpIds: ipIds.length
      },
      categoryBreakdown,
      ipIds
    }
  } catch (error) {
    console.error(`Failed to get stats for submission ${submissionId}:`, error)
    throw new Error('Failed to retrieve submission statistics')
  }
}