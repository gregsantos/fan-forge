import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { assets, ipKits, assetIpKits } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getUserBrandIds } from '@/lib/auth-utils'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

const addAssetsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1, 'At least one asset ID is required')
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipKitId = params.id
    const body = await request.json()
    const { assetIds } = addAssetsSchema.parse(body)

    // Verify IP Kit exists and user has access
    const [ipKit] = await db
      .select()
      .from(ipKits)
      .where(eq(ipKits.id, ipKitId))
      .limit(1)

    if (!ipKit) {
      return NextResponse.json({ error: 'IP Kit not found' }, { status: 404 })
    }

    // SECURITY: Verify user has access to this IP kit's brand
    const userBrandIds = await getUserBrandIds(user.id)
    if (!userBrandIds.includes(ipKit.brandId)) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this IP kit' },
        { status: 403 }
      )
    }

    // Verify all assets exist and belong to the same brand
    const assetsToAdd = await db
      .select()
      .from(assets)
      .where(inArray(assets.id, assetIds))

    if (assetsToAdd.length !== assetIds.length) {
      return NextResponse.json(
        { error: 'Some assets were not found' },
        { status: 404 }
      )
    }

    // Check if any assets already belong to this IP kit
    const existingRelations = await db
      .select()
      .from(assetIpKits)
      .where(
        and(
          eq(assetIpKits.ipKitId, ipKitId),
          inArray(assetIpKits.assetId, assetIds)
        )
      )

    const existingAssetIds = existingRelations.map(rel => rel.assetId)
    const newAssetIds = assetIds.filter(id => !existingAssetIds.includes(id))

    if (newAssetIds.length === 0) {
      return NextResponse.json(
        { error: 'All selected assets are already in this IP kit' },
        { status: 400 }
      )
    }

    // Add assets to IP kit
    const newRelations = newAssetIds.map(assetId => ({
      ipKitId,
      assetId,
      addedAt: new Date()
    }))

    await db.insert(assetIpKits).values(newRelations)

    // Return the newly added assets
    const addedAssets = await db
      .select({
        id: assets.id,
        filename: assets.filename,
        originalFilename: assets.originalFilename,
        url: assets.url,
        thumbnailUrl: assets.thumbnailUrl,
        category: assets.category,
        tags: assets.tags,
        metadata: assets.metadata,
        ipId: assets.ipId,
        createdAt: assets.createdAt
      })
      .from(assets)
      .where(inArray(assets.id, newAssetIds))

    return NextResponse.json({
      message: `Added ${newAssetIds.length} assets to IP kit`,
      addedAssets,
      skippedCount: existingAssetIds.length
    })

  } catch (error) {
    console.error('Add assets to IP kit error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}