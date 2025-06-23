import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { assets, ipKits, brands } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { assetStorageService } from '@/lib/services/asset-storage'

// Asset update schema
const updateAssetSchema = z.object({
  originalFilename: z.string().optional(),
  category: z.enum(['characters', 'backgrounds', 'logos', 'titles', 'props', 'other']).optional(),
  tags: z.array(z.string()).optional(),
})

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

    // TODO: Add proper permission check - user should have access to the brand/IP Kit

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

    // TODO: Add proper permission check - user should be brand owner or admin

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

    // TODO: Add proper permission check - user should be brand owner or admin

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