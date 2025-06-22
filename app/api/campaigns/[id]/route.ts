import { NextRequest, NextResponse } from "next/server"
import { db, campaigns, brands, ipKits, assets } from "@/db"
import { eq, and } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First check if campaign exists at all
    const campaignExists = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, params.id))
      .limit(1)

    console.log('Campaign lookup:', {
      campaignId: params.id,
      exists: campaignExists.length > 0,
      campaign: campaignExists[0] || null
    })

    if (campaignExists.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // Get campaign with relations
    const campaignWithDetails = await db
      .select({
        campaign: campaigns,
        brand: brands,
        ipKit: ipKits,
      })
      .from(campaigns)
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .leftJoin(ipKits, eq(campaigns.ipKitId, ipKits.id))
      .where(eq(campaigns.id, params.id))
      .limit(1)

    console.log('Campaign with details:', {
      campaignId: params.id,
      found: campaignWithDetails.length > 0,
      campaign: campaignWithDetails[0]?.campaign || null,
      brand: campaignWithDetails[0]?.brand || null,
      ipKit: campaignWithDetails[0]?.ipKit || null
    })

    if (campaignWithDetails.length === 0) {
      console.log('Campaign with details not found for ID:', params.id)
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    const result = campaignWithDetails[0]

    // Get assets for the campaign's IP kit
    const campaignAssets = result.ipKit ? await db
      .select()
      .from(assets)
      .where(eq(assets.ipKitId, result.ipKit.id)) : []

    console.log('Campaign assets:', {
      campaignId: params.id,
      ipKitId: result.ipKit?.id || null,
      assetsFound: campaignAssets.length
    })

    return NextResponse.json({
      campaign: {
        id: result.campaign.id,
        title: result.campaign.title,
        description: result.campaign.description,
        guidelines: result.campaign.guidelines,
        brand_name: result.brand?.name,
        status: result.campaign.status,
        deadline: result.campaign.endDate,
        created_at: result.campaign.createdAt,
        assets: campaignAssets.map(asset => ({
          id: asset.id,
          filename: asset.filename,
          url: asset.url,
          category: asset.category,
          metadata: asset.metadata,
        }))
      }
    })
    
  } catch (error) {
    console.error('Failed to fetch campaign:', {
      campaignId: params.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if campaign exists
    const existingCampaign = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, params.id))
      .limit(1)
    
    if (existingCampaign.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    const { 
      title, 
      description, 
      guidelines, 
      ipKitId,
      startDate,
      endDate,
      maxSubmissions,
      rewardAmount,
      rewardCurrency = "USD",
      briefDocument,
      status = "draft"
    } = body
    
    if (!title || !description || !guidelines || !ipKitId) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, guidelines, and ipKitId are required" },
        { status: 400 }
      )
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (end <= start) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        )
      }
    }

    if (endDate && new Date(endDate) <= new Date()) {
      return NextResponse.json(
        { error: "End date must be in the future" },
        { status: 400 }
      )
    }

    // Validate status transitions
    const allowedTransitions: Record<string, string[]> = {
      "draft": ["active"],
      "active": ["paused", "closed"],
      "paused": ["active", "closed"],
      "closed": [] // Cannot transition from closed
    }

    const currentCampaign = existingCampaign[0]
    if (status !== currentCampaign.status) {
      const allowed = allowedTransitions[currentCampaign.status] || []
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${currentCampaign.status} to ${status}` },
          { status: 400 }
        )
      }
    }

    // Update campaign in database
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({
        title,
        description,
        guidelines,
        ipKitId,
        status: status as "draft" | "active" | "paused" | "closed",
        startDate: startDate ? new Date(startDate) : currentCampaign.startDate,
        endDate: endDate ? new Date(endDate) : currentCampaign.endDate,
        maxSubmissions: maxSubmissions || null,
        rewardAmount: rewardAmount || null,
        rewardCurrency,
        briefDocument: briefDocument || null,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, params.id))
      .returning()

    return NextResponse.json({
      campaign: {
        id: updatedCampaign.id,
        title: updatedCampaign.title,
        status: updatedCampaign.status,
        updated_at: updatedCampaign.updatedAt,
      }
    })

  } catch (error) {
    console.error("Campaign update error:", error)
    return NextResponse.json(
      { error: "Invalid request data" },
      { status: 400 }
    )
  }
}