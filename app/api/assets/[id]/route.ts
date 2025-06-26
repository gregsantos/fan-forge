import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { assets, ipKits, brands, campaigns, submissions, submissionAssets, assetIpKits } from '@/db/schema'
import { eq, and, arrayContains, sql } from 'drizzle-orm'
import { z } from 'zod'
import { assetStorageService } from '@/lib/services/asset-storage'
import { getUserBrandIds } from '@/lib/auth-utils'

// Asset update schema
const updateAssetSchema = z.object({
  originalFilename: z.string().optional(),
  category: z.enum(['characters', 'backgrounds', 'logos', 'titles', 'props', 'other']).optional(),
  tags: z.array(z.string()).optional(),
})

// Helper function to check asset usage across the system
async function checkAssetUsage(assetId: string) {
  try {
    // Check for active campaigns using this asset through their IP kits
    const activeCampaignsQuery = await db
      .select({
        campaign: campaigns,
        ipKit: ipKits
      })
      .from(campaigns)
      .leftJoin(ipKits, eq(campaigns.ipKitId, ipKits.id))
      .leftJoin(assetIpKits, eq(ipKits.id, assetIpKits.ipKitId))
      .where(
        and(
          eq(assetIpKits.assetId, assetId),
          eq(campaigns.status, 'active')
        )
      )

    // Check for submissions using this asset
    const submissionsQuery = await db
      .select({
        submission: submissions,
        campaign: campaigns
      })
      .from(submissions)
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .where(sql`submissions.used_asset_ids ? ${assetId}`)

    // Check for submissions using this asset via junction table
    const submissionAssetsQuery = await db
      .select({
        submission: submissions,
        campaign: campaigns
      })
      .from(submissionAssets)
      .leftJoin(submissions, eq(submissionAssets.submissionId, submissions.id))
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .where(eq(submissionAssets.assetId, assetId))

    const activeCampaigns = activeCampaignsQuery || []
    const affectedSubmissions = [...(submissionsQuery || []), ...(submissionAssetsQuery || [])]
    
    // For now, we'll be conservative and warn about any usage
    // In the future, you might want to allow deletion with confirmation
    const hasUsage = activeCampaigns.length > 0 || affectedSubmissions.length > 0

    return {
      hasUsage,
      details: {
        activeCampaigns: activeCampaigns.length,
        affectedSubmissions: affectedSubmissions.length,
        campaignNames: activeCampaigns.map(c => c.campaign.title),
        submissionIds: affectedSubmissions.map(s => s.submission.id)
      }
    }
  } catch (error) {
    console.error('Error checking asset usage:', error)
    return {
      hasUsage: true, // Err on the side of caution
      details: {
        error: 'Could not verify asset usage - deletion blocked for safety'
      }
    }
  }
}

// Helper function to check if user has access to an asset
async function checkAssetAccess(userId: string, assetData: any) {
  const userBrandIds = await getUserBrandIds(userId)
  
  if (userBrandIds.length === 0) {
    return { hasAccess: false, reason: 'User has no brand access' }
  }

  // For assets with IP Kits - check if user has access to the IP Kit's brand
  if (assetData.ipKit?.brandId) {
    if (!userBrandIds.includes(assetData.ipKit.brandId)) {
      return { hasAccess: false, reason: 'User does not have access to this IP Kit\'s brand' }
    }
  } else {
    // For global assets - check if uploader belongs to same brand as current user
    const assetUploaderBrands = await getUserBrandIds(assetData.asset.uploadedBy)
    const hasSharedBrand = userBrandIds.some(brandId => 
      assetUploaderBrands.includes(brandId)
    )
    
    if (!hasSharedBrand) {
      return { hasAccess: false, reason: 'Asset uploader does not belong to your brand' }
    }
  }
  
  return { hasAccess: true, reason: 'Access granted' }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assetId = params.id

    // Get asset with IP Kit and brand information
    const [assetResult] = await db
      .select({
        asset: assets,
        ipKit: ipKits,
        brand: brands
      })
      .from(assets)
      .leftJoin(ipKits, eq(assets.ipKitId, ipKits.id))
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .where(eq(assets.id, assetId))
      .limit(1)

    if (!assetResult) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // SECURITY: Check if user has access to this asset
    const accessCheck = await checkAssetAccess(user.id, assetResult)
    if (!accessCheck.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      ...assetResult.asset,
      ipKit: assetResult.ipKit,
      brand: assetResult.brand
    })

  } catch (error) {
    console.error('Asset GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assetId = params.id
    const body = await request.json()
    const updateData = updateAssetSchema.parse(body)

    // First check if asset exists and user has permission
    const [existingAsset] = await db
      .select({
        asset: assets,
        ipKit: ipKits,
        brand: brands
      })
      .from(assets)
      .leftJoin(ipKits, eq(assets.ipKitId, ipKits.id))
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .where(eq(assets.id, assetId))
      .limit(1)

    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // SECURITY: Check if user has access to this asset
    const accessCheck = await checkAssetAccess(user.id, existingAsset)
    if (!accessCheck.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update asset
    const [updatedAsset] = await db
      .update(assets)
      .set(updateData)
      .where(eq(assets.id, assetId))
      .returning()

    return NextResponse.json(updatedAsset)

  } catch (error) {
    console.error('Asset PATCH error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid asset data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assetId = params.id
    const { searchParams } = new URL(request.url)
    const forceDelete = searchParams.get('force') === 'true'

    // Get asset details before deletion
    const [assetToDelete] = await db
      .select({
        asset: assets,
        ipKit: ipKits,
        brand: brands
      })
      .from(assets)
      .leftJoin(ipKits, eq(assets.ipKitId, ipKits.id))
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .where(eq(assets.id, assetId))
      .limit(1)

    if (!assetToDelete) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // SECURITY: Check if user has access to this asset
    const accessCheck = await checkAssetAccess(user.id, assetToDelete)
    if (!accessCheck.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check asset usage before deletion (unless force delete is requested)
    const usageCheck = await checkAssetUsage(assetId)
    
    if (usageCheck.hasUsage && !forceDelete) {
      // Return warning with usage details, requiring confirmation
      return NextResponse.json({
        error: 'Asset is in use and requires confirmation to delete',
        details: usageCheck.details,
        confirmRequired: true,
        forceDeleteUrl: `/api/assets/${assetId}?force=true`
      }, { status: 409 }) // Conflict status
    }

    try {
      // Perform cascade deletion in transaction
      await db.transaction(async (trx) => {
        // 1. Clean up submission usedAssetIds arrays
        await trx
          .update(submissions)
          .set({
            usedAssetIds: sql`COALESCE(
              (
                SELECT jsonb_agg(elem)
                FROM jsonb_array_elements_text(used_asset_ids) AS elem
                WHERE elem != ${assetId}
              ), 
              '[]'::jsonb
            )`
          })
          .where(sql`used_asset_ids ? ${assetId}`)

        // 2. Delete junction table records (CASCADE will handle these, but explicit for clarity)
        await trx
          .delete(submissionAssets)
          .where(eq(submissionAssets.assetId, assetId))
          
        await trx
          .delete(assetIpKits)
          .where(eq(assetIpKits.assetId, assetId))

        // 3. Delete the asset record (this will cascade to remaining relationships)
        await trx
          .delete(assets)
          .where(eq(assets.id, assetId))
      })

      // 4. Delete from storage after successful database deletion
      try {
        await assetStorageService.deleteAsset(
          assetToDelete.asset.url, 
          assetToDelete.asset.thumbnailUrl || undefined
        )
      } catch (storageError) {
        console.error('Failed to delete from storage after DB deletion:', storageError)
        // Log but don't fail the request since DB cleanup succeeded
      }

      return NextResponse.json({ 
        message: 'Asset deleted successfully',
        details: {
          deletedAsset: assetToDelete.asset.filename,
          cleanedSubmissions: usageCheck.details.affectedSubmissions || 0
        }
      })

    } catch (dbError) {
      console.error('Database deletion failed:', dbError)
      return NextResponse.json(
        { error: 'Failed to delete asset from database' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Asset DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}