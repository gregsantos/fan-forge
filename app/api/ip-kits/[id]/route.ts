import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { ipKits, brands, assets, campaigns } from '@/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { z } from 'zod'

// IP Kit update schema
const updateIpKitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  guidelines: z.string().optional(),
  isPublished: z.boolean().optional(),
  version: z.number().optional()
})

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipKitId = params.id

    // Get IP Kit with brand info and asset count
    const result = await db
      .select({
        id: ipKits.id,
        name: ipKits.name,
        description: ipKits.description,
        guidelines: ipKits.guidelines,
        brandId: ipKits.brandId,
        isPublished: ipKits.isPublished,
        version: ipKits.version,
        createdAt: ipKits.createdAt,
        updatedAt: ipKits.updatedAt,
        brandName: brands.name,
        brandDescription: brands.description,
        assetCount: count(assets.id)
      })
      .from(ipKits)
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .leftJoin(assets, eq(ipKits.id, assets.ipKitId))
      .where(eq(ipKits.id, ipKitId))
      .groupBy(ipKits.id, brands.id)
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json({ error: 'IP Kit not found' }, { status: 404 })
    }

    // Get assets for this IP Kit
    const ipKitAssets = await db
      .select({
        id: assets.id,
        filename: assets.filename,
        originalFilename: assets.originalFilename,
        url: assets.url,
        thumbnailUrl: assets.thumbnailUrl,
        category: assets.category,
        tags: assets.tags,
        metadata: assets.metadata,
        createdAt: assets.createdAt
      })
      .from(assets)
      .where(eq(assets.ipKitId, ipKitId))
      .orderBy(assets.createdAt)

    const ipKitWithAssets = {
      ...result[0],
      assets: ipKitAssets
    }

    return NextResponse.json(ipKitWithAssets)

  } catch (error) {
    console.error('IP Kit GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipKitId = params.id
    const body = await request.json()
    const updateData = updateIpKitSchema.parse(body)

    // Verify IP Kit exists
    const existingIpKit = await db
      .select()
      .from(ipKits)
      .where(eq(ipKits.id, ipKitId))
      .limit(1)

    if (existingIpKit.length === 0) {
      return NextResponse.json({ error: 'IP Kit not found' }, { status: 404 })
    }

    // TODO: Add proper authorization check for IP Kit access

    // If publishing, increment version
    const updateDataWithVersion = { ...updateData }
    if (updateData.isPublished && !existingIpKit[0].isPublished) {
      updateDataWithVersion.version = (existingIpKit[0].version || 1) + 1
    }

    // Update the IP Kit
    const [updatedIpKit] = await db
      .update(ipKits)
      .set({
        ...updateDataWithVersion,
        updatedAt: new Date()
      })
      .where(eq(ipKits.id, ipKitId))
      .returning()

    return NextResponse.json(updatedIpKit)

  } catch (error) {
    console.error('IP Kit PATCH error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid update data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipKitId = params.id

    // Verify IP Kit exists
    const existingIpKit = await db
      .select()
      .from(ipKits)
      .where(eq(ipKits.id, ipKitId))
      .limit(1)

    if (existingIpKit.length === 0) {
      return NextResponse.json({ error: 'IP Kit not found' }, { status: 404 })
    }

    // TODO: Add proper authorization check for IP Kit access

    // Check if IP Kit is being used in any campaigns
    const campaignsUsingIpKit = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        status: campaigns.status,
        createdAt: campaigns.createdAt
      })
      .from(campaigns)
      .where(eq(campaigns.ipKitId, ipKitId))

    const activeCampaigns = campaignsUsingIpKit.filter(
      campaign => campaign.status === 'active' || campaign.status === 'draft'
    )

    // If there are active campaigns, return warning but allow deletion with force flag
    const forceDelete = request.nextUrl.searchParams.get('force') === 'true'
    
    if (activeCampaigns.length > 0 && !forceDelete) {
      return NextResponse.json({
        error: 'IP Kit is in use',
        code: 'IP_KIT_IN_USE',
        details: {
          activeCampaigns: activeCampaigns.map(c => ({
            id: c.id,
            title: c.title,
            status: c.status
          })),
          totalCampaigns: campaignsUsingIpKit.length,
          message: `This IP Kit is used by ${activeCampaigns.length} active campaign(s). Deleting it will affect these campaigns.`
        }
      }, { status: 409 }) // Conflict status
    }

    // Delete the IP Kit (assets will be cascade deleted by the DB schema)
    await db
      .delete(ipKits)
      .where(eq(ipKits.id, ipKitId))

    return NextResponse.json({ 
      message: 'IP Kit deleted successfully',
      affectedCampaigns: campaignsUsingIpKit.length
    })

  } catch (error) {
    console.error('IP Kit DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}