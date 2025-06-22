import { NextRequest, NextResponse } from "next/server"
import { db, campaigns, brands, ipKits, assets, submissions } from "@/db"
import { desc, asc, eq, and, ilike, or, count, isNotNull, gt, lte, isNull } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const deadline = searchParams.get("deadline")
    const assetCount = searchParams.get("assetCount")
    const featured = searchParams.get("featured")
    const sortBy = searchParams.get("sortBy") || "created_at"
    const sortDirection = searchParams.get("sortDirection") || "desc"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")

    // Build where conditions
    const whereConditions = []

    // Apply search filter
    if (search) {
      whereConditions.push(
        or(
          ilike(campaigns.title, `%${search}%`),
          ilike(campaigns.description, `%${search}%`),
          ilike(brands.name, `%${search}%`)
        )
      )
    }

    // Apply status filter
    if (status && status !== "all") {
      const statusList = status.split(",").filter(s => s.length > 0)
      if (statusList.length > 0) {
        whereConditions.push(
          or(...statusList.map(s => eq(campaigns.status, s as any)))
        )
      }
    }

    // Apply featured filter
    if (featured === "true") {
      whereConditions.push(
        and(
          isNotNull(campaigns.featuredUntil),
          gt(campaigns.featuredUntil, new Date())
        )
      )
    }

    // Apply deadline filter
    if (deadline && deadline !== "all") {
      const now = new Date()
      switch (deadline) {
        case "week":
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          whereConditions.push(
            and(
              isNotNull(campaigns.endDate),
              lte(campaigns.endDate, weekFromNow),
              gt(campaigns.endDate, now)
            )
          )
          break
        case "month":
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          whereConditions.push(
            and(
              isNotNull(campaigns.endDate),
              lte(campaigns.endDate, monthFromNow),
              gt(campaigns.endDate, now)
            )
          )
          break
        case "quarter":
          const quarterFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
          whereConditions.push(
            and(
              isNotNull(campaigns.endDate),
              lte(campaigns.endDate, quarterFromNow),
              gt(campaigns.endDate, now)
            )
          )
          break
        case "none":
          whereConditions.push(isNull(campaigns.endDate))
          break
      }
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(campaigns)
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .where(whereClause)

    const total = totalResult.count

    // Determine sort order
    const sortColumn = sortBy === "title" ? campaigns.title :
                      sortBy === "deadline" ? campaigns.endDate :
                      campaigns.createdAt
    const sortOrder = sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn)

    // Get campaigns with relations, asset count, and submission count
    const campaignResults = await db
      .select({
        campaign: campaigns,
        brand: brands,
        assetCount: count(assets.id),
      })
      .from(campaigns)
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .leftJoin(ipKits, eq(campaigns.ipKitId, ipKits.id))
      .leftJoin(assets, eq(ipKits.id, assets.ipKitId))
      .where(whereClause)
      .groupBy(campaigns.id, brands.id)
      .orderBy(sortOrder)
      .limit(limit)
      .offset((page - 1) * limit)

    // Get submission counts for each campaign
    const campaignIds = campaignResults.map(result => result.campaign.id)
    const submissionCounts = campaignIds.length > 0 ? await db
      .select({
        campaignId: submissions.campaignId,
        submissionCount: count(submissions.id),
      })
      .from(submissions)
      .where(or(...campaignIds.map(id => eq(submissions.campaignId, id))))
      .groupBy(submissions.campaignId) : []

    // Create a map for quick lookup of submission counts
    const submissionCountMap = new Map(
      submissionCounts.map(sc => [sc.campaignId, sc.submissionCount])
    )

    const response = {
      campaigns: campaignResults.map(result => ({
        id: result.campaign.id,
        title: result.campaign.title,
        description: result.campaign.description,
        brand_name: result.brand?.name || "Unknown Brand",
        status: result.campaign.status,
        deadline: result.campaign.endDate,
        asset_count: result.assetCount || 0,
        submission_count: submissionCountMap.get(result.campaign.id) || 0,
        thumbnail_url: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop", // TODO: Use first asset or campaign thumbnail
        created_at: result.campaign.createdAt,
        updated_at: result.campaign.updatedAt,
        featured: result.campaign.featuredUntil ? new Date(result.campaign.featuredUntil) > new Date() : false,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        search,
        status,
        category,
        deadline,
        assetCount,
        sortBy,
        sortDirection
      }
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Get the authenticated user for createdBy field
    // For now, we'll use a placeholder - this should be implemented with proper auth
    const createdBy = "placeholder-user-id" // TODO: Get from authenticated session

    // Verify IP Kit exists
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

    // Create new campaign in database
    const [newCampaign] = await db
      .insert(campaigns)
      .values({
        title,
        description,
        guidelines,
        ipKitId: ipKitId || null,
        brandId: "placeholder-brand-id", // TODO: Get from authenticated user's brand
        status: status as "draft" | "active" | "paused" | "closed",
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        maxSubmissions: maxSubmissions || null,
        rewardAmount: rewardAmount || null,
        rewardCurrency,
        briefDocument: briefDocument || null,
        createdBy,
      })
      .returning()

    return NextResponse.json({
      campaign: {
        id: newCampaign.id,
        title: newCampaign.title,
        status: newCampaign.status,
        created_at: newCampaign.createdAt,
        updated_at: newCampaign.updatedAt,
      }
    }, { status: 201 })

  } catch (error) {
    console.error("Campaign creation error:", error)
    return NextResponse.json(
      { error: "Invalid request data" },
      { status: 400 }
    )
  }
}