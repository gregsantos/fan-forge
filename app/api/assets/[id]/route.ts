import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { assets, ipKits, brands } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { assetStorageService } from '@/lib/services/asset-storage'
import { getUserBrandIds } from '@/lib/auth-utils'

// Asset update schema
const updateAssetSchema = z.object({
  originalFilename: z.string().optional(),
  category: z.enum(['characters', 'backgrounds', 'logos', 'titles', 'props', 'other']).optional(),
  tags: z.array(z.string()).optional(),
})

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

    // TODO: Check if asset is used in active campaigns and warn user

    try {
      // Delete from storage first
      await assetStorageService.deleteAsset(
        assetToDelete.asset.url, 
        assetToDelete.asset.thumbnailUrl || undefined
      )
    } catch (storageError) {
      console.error('Failed to delete from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await db
      .delete(assets)
      .where(eq(assets.id, assetId))

    return NextResponse.json({ message: 'Asset deleted successfully' })

  } catch (error) {
    console.error('Asset DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}