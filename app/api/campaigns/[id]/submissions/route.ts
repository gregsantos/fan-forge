import {NextRequest, NextResponse} from "next/server"
import {db, submissions, users, ipKits} from "@/db"
import {eq, and, desc, asc, ilike, or} from "drizzle-orm"

export async function GET(
  request: NextRequest,
  {params}: {params: {id: string}}
) {
  try {
    const campaignId = params.id
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "approved" // Default to approved for public showcase
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")
    const search = searchParams.get("search") || ""
    const sortBy = searchParams.get("sortBy") || "newest"

    // Build where conditions
    const whereConditions = [eq(submissions.campaignId, campaignId)]

    if (status === "approved") {
      whereConditions.push(eq(submissions.status, "approved"))
      whereConditions.push(eq(submissions.isPublic, true))
    } else if (status && status !== "all") {
      whereConditions.push(eq(submissions.status, status as any))
    }

    // Add search functionality
    if (search) {
      const searchCondition = or(
        ilike(submissions.title, `%${search}%`),
        ilike(users.displayName, `%${search}%`)
      )
      if (searchCondition) {
        whereConditions.push(searchCondition)
      }
    }

    // Determine sort order
    const getSortOrder = () => {
      switch (sortBy) {
        case "oldest":
          return asc(submissions.createdAt)
        case "popular":
          return [desc(submissions.likeCount), desc(submissions.viewCount)]
        case "title":
          return asc(submissions.title)
        case "newest":
        default:
          return desc(submissions.createdAt)
      }
    }

    // Get submissions for this campaign
    const campaignSubmissions = await db
      .select({
        submission: submissions,
        creator: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        usedIpKit: {
          id: ipKits.id,
          name: ipKits.name,
        },
      })
      .from(submissions)
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .leftJoin(ipKits, eq(submissions.ipKitId, ipKits.id))
      .where(and(...whereConditions))
      .orderBy(
        ...(Array.isArray(getSortOrder())
          ? (getSortOrder() as any)
          : [getSortOrder()])
      )
      .limit(limit)
      .offset((page - 1) * limit)

    // Get total count for pagination
    const totalSubmissions = await db
      .select({count: submissions.id})
      .from(submissions)
      .where(and(...whereConditions))

    return NextResponse.json({
      submissions: campaignSubmissions.map(result => ({
        ...result.submission,
        creator: result.creator,
        usedIpKit: result.usedIpKit,
      })),
      pagination: {
        page,
        limit,
        total: totalSubmissions.length,
        pages: Math.ceil(totalSubmissions.length / limit),
      },
    })
  } catch (error) {
    console.error("Failed to fetch campaign submissions:", error)
    return NextResponse.json(
      {error: "Failed to fetch submissions"},
      {status: 500}
    )
  }
}
