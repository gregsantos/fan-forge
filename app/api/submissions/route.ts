import {NextRequest, NextResponse} from "next/server"
import {cookies} from "next/headers"
import {db, submissions, campaigns, users, ipKits, submissionAssets} from "@/db"
import {eq, and, desc, count, ilike, or} from "drizzle-orm"
import {createClient} from "@/utils/supabase/server"
import {ensureUserExists} from "@/lib/auth-utils"
import {canvasAssetTracker} from "@/lib/canvas-asset-tracker"

async function getCurrentUser(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: {user},
  } = await supabase.auth.getUser()

  // Ensure user exists in our database if authenticated
  if (user) {
    await ensureUserExists(user)
  }

  return user
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get("campaign_id")
    const creatorId = searchParams.get("creator_id")
    const status = searchParams.get("status")
    const ipId = searchParams.get("ip_id")
    const search = searchParams.get("search")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    // Handle current user requests
    let actualCreatorId = creatorId
    if (creatorId === "current-user") {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json(
          {error: "Authentication required"},
          {status: 401}
        )
      }
      actualCreatorId = user.id
    }

    // Build where conditions
    const whereConditions = []

    if (campaignId) {
      whereConditions.push(eq(submissions.campaignId, campaignId))
    }

    if (actualCreatorId) {
      whereConditions.push(eq(submissions.creatorId, actualCreatorId))
    }

    if (status && status !== "all") {
      whereConditions.push(eq(submissions.status, status as any))
    }

    if (ipId) {
      whereConditions.push(eq(submissions.ipKitId, ipId))
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(submissions.title, `%${search}%`),
          ilike(submissions.description, `%${search}%`)
        )
      )
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get total count
    const [totalResult] = await db
      .select({count: count()})
      .from(submissions)
      .where(whereClause)

    const total = totalResult.count

    // Get submissions with relations
    const submissionResults = await db
      .select({
        submission: submissions,
        campaign: campaigns,
        creator: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
        ipKit: {
          id: ipKits.id,
          name: ipKits.name,
        },
      })
      .from(submissions)
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .leftJoin(ipKits, eq(submissions.ipKitId, ipKits.id))
      .where(whereClause)
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset((page - 1) * limit)

    return NextResponse.json({
      submissions: submissionResults.map(result => ({
        ...result.submission,
        campaign: result.campaign,
        creator: result.creator,
        ipKit: result.ipKit,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Failed to fetch submissions:", error)
    return NextResponse.json(
      {error: "Failed to fetch submissions"},
      {status: 500}
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        {error: "Authentication required"},
        {status: 401}
      )
    }

    const body = await request.json()

    // Validate required fields
    const {
      campaignId,
      title,
      description,
      artworkUrl,
      thumbnailUrl,
      canvasData,
      assetMetadata,
      tags = [],
      usedIpKitId,
    } = body

    if (!campaignId || !title || !artworkUrl) {
      return NextResponse.json(
        {error: "Missing required fields: campaignId, title, artworkUrl"},
        {status: 400}
      )
    }

    // Verify campaign exists and is active
    const dbCampaigns = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)

    if (dbCampaigns.length === 0) {
      return NextResponse.json({error: "Campaign not found"}, {status: 404})
    }

    const campaign = dbCampaigns[0]

    if (campaign.status !== "active") {
      return NextResponse.json(
        {error: "Campaign is not accepting submissions"},
        {status: 400}
      )
    }

    // Extract used asset IDs from canvas data
    const usedAssetIds = canvasData?.elements
      ? canvasAssetTracker.getUsedAssetIds(canvasData.elements)
      : []

    // Create new submission with asset metadata
    const submissionData = {
      title,
      description,
      artworkUrl,
      thumbnailUrl,
      canvasData: {
        ...canvasData,
        assetMetadata, // Include asset tracking metadata in canvas data
      },
      usedAssetIds, // Keep for backwards compatibility during transition
      tags,
      campaignId,
      creatorId: user.id,
      ipKitId: usedIpKitId || campaign.ipKitId, // Use campaign's IP Kit if not specified
      status: "pending" as const,
      isPublic: false,
      viewCount: 0,
      likeCount: 0,
    }

    const [newSubmission] = await db
      .insert(submissions)
      .values(submissionData)
      .returning()

    // Insert asset relationships into junction table
    if (usedAssetIds.length > 0) {
      const assetRelationships = usedAssetIds.map(assetId => ({
        submissionId: newSubmission.id,
        assetId: assetId,
      }))

      await db
        .insert(submissionAssets)
        .values(assetRelationships)
        .onConflictDoNothing() // Prevent duplicates
    }

    // Get submission with relations for response
    const submissionWithDetails = await db
      .select({
        submission: submissions,
        campaign: campaigns,
        creator: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(submissions)
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .where(eq(submissions.id, newSubmission.id))
      .limit(1)

    return NextResponse.json(
      {
        submission: {
          ...submissionWithDetails[0].submission,
          campaign: submissionWithDetails[0].campaign,
          creator: submissionWithDetails[0].creator,
        },
      },
      {status: 201}
    )
  } catch (error) {
    console.error("Failed to create submission:", error)
    return NextResponse.json(
      {error: "Failed to create submission"},
      {status: 500}
    )
  }
}
