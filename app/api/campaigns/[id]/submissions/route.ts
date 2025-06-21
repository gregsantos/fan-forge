import { NextRequest, NextResponse } from "next/server"
import { db, submissions, users, ipKits } from "@/db"
import { eq, and, desc } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "approved" // Default to approved for public showcase
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")

    // Build where conditions
    const whereConditions = [
      eq(submissions.campaignId, campaignId)
    ]

    if (status === "approved") {
      whereConditions.push(eq(submissions.status, "approved"))
      whereConditions.push(eq(submissions.isPublic, true))
    } else if (status && status !== "all") {
      whereConditions.push(eq(submissions.status, status as any))
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
      .leftJoin(ipKits, eq(submissions.ipId, ipKits.id))
      .where(and(...whereConditions))
      .orderBy(desc(submissions.likeCount), desc(submissions.viewCount), desc(submissions.createdAt))
      .limit(limit)
      .offset((page - 1) * limit)

    // Get total count for pagination
    const totalSubmissions = await db
      .select({ count: submissions.id })
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
      }
    })

  } catch (error) {
    console.error('Failed to fetch campaign submissions:', error)
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 }
    )
  }
}