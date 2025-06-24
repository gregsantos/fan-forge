import { NextRequest, NextResponse } from "next/server"
import { getCampaignById } from "@/lib/data/campaigns"
import { db, campaigns, ipKits } from "@/db"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await getCampaignById(params.id)
    
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ campaign })
    
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
    
    if (!title || !description || !guidelines) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, and guidelines are required" },
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

    // Verify IP Kit exists if provided
    if (ipKitId) {
      const existingIpKit = await db
        .select()
        .from(ipKits)
        .where(eq(ipKits.id, ipKitId))
        .limit(1)
      
      if (existingIpKit.length === 0) {
        return NextResponse.json(
          { error: "IP Kit not found" },
          { status: 404 }
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
        ipKitId: ipKitId || null,
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