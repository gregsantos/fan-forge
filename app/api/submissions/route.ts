import { NextRequest, NextResponse } from "next/server"
import { db, submissions, campaigns, users, ipKits } from "@/db"
import { eq, and, desc, count, ilike, or } from "drizzle-orm"
import { createServerClient } from '@supabase/ssr'
import { ensureUserExists } from '@/lib/auth-utils'

async function getCurrentUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers.get('cookie')?.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=')
            return { name, value }
          }) || []
        },
        setAll() {}, // Not needed for read operations
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
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
          { error: "Authentication required" },
          { status: 401 }
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
      whereConditions.push(eq(submissions.ipId, ipId))
    }
    
    if (search) {
      whereConditions.push(
        or(
          ilike(submissions.title, `%${search}%`),
          ilike(submissions.description, `%${search}%`)
        )
      )
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
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
      .leftJoin(ipKits, eq(submissions.ipId, ipKits.id))
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
      }
    })

  } catch (error) {
    console.error('Failed to fetch submissions:', error)
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    const { campaignId, title, description, artworkUrl, thumbnailUrl, canvasData, tags = [], usedIpKitId } = body
    
    if (!campaignId || !title || !artworkUrl) {
      return NextResponse.json(
        { error: "Missing required fields: campaignId, title, artworkUrl" },
        { status: 400 }
      )
    }

    // Verify campaign exists and is active
    const dbCampaigns = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1)

    if (dbCampaigns.length === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    const campaign = dbCampaigns[0]

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: "Campaign is not accepting submissions" },
        { status: 400 }
      )
    }

    // Create new submission
    const [newSubmission] = await db
      .insert(submissions)
      .values({
        title,
        description,
        artworkUrl,
        thumbnailUrl,
        canvasData,
        tags,
        campaignId,
        creatorId: user.id,
        ipId: usedIpKitId || null,
        status: 'pending',
        isPublic: false,
        viewCount: 0,
        likeCount: 0,
      })
      .returning()

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

    return NextResponse.json({
      submission: {
        ...submissionWithDetails[0].submission,
        campaign: submissionWithDetails[0].campaign,
        creator: submissionWithDetails[0].creator,
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create submission:', error)
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    )
  }
}