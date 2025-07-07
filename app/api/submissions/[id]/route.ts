import {NextRequest, NextResponse} from "next/server"
import {db, submissions, campaigns, users, ipKits} from "@/db"
import {eq} from "drizzle-orm"
import {createServerClient} from "@supabase/ssr"

async function getCurrentUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return (
            request.headers
              .get("cookie")
              ?.split(";")
              .map(cookie => {
                const [name, value] = cookie.trim().split("=")
                return {name, value}
              }) || []
          )
        },
        setAll() {}, // Not needed for read operations
      },
    }
  )

  const {
    data: {user},
  } = await supabase.auth.getUser()
  return user
}

export async function GET(
  request: NextRequest,
  {params}: {params: {id: string}}
) {
  try {
    const submissionId = params.id

    // Get submission with relations
    const submissionResult = await db
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
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (submissionResult.length === 0) {
      return NextResponse.json({error: "Submission not found"}, {status: 404})
    }

    const result = submissionResult[0]

    return NextResponse.json({
      submission: {
        ...result.submission,
        campaign: result.campaign,
        creator: result.creator,
        ipKit: result.ipKit,
      },
    })
  } catch (error) {
    console.error("Failed to fetch submission:", error)
    return NextResponse.json(
      {error: "Failed to fetch submission"},
      {status: 500}
    )
  }
}

export async function PUT(
  request: NextRequest,
  {params}: {params: {id: string}}
) {
  try {
    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        {error: "Authentication required"},
        {status: 401}
      )
    }

    const submissionId = params.id
    const body = await request.json()

    // Get existing submission to verify ownership
    const existingSubmission = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (existingSubmission.length === 0) {
      return NextResponse.json({error: "Submission not found"}, {status: 404})
    }

    // Only creator can update their own submissions, and only if pending
    if (existingSubmission[0].creatorId !== user.id) {
      return NextResponse.json(
        {error: "Not authorized to update this submission"},
        {status: 403}
      )
    }

    if (existingSubmission[0].status !== "pending") {
      return NextResponse.json(
        {error: "Cannot update submission that is not pending"},
        {status: 400}
      )
    }

    // Update submission
    const {title, description, artworkUrl, thumbnailUrl, canvasData, tags} =
      body

    const [updatedSubmission] = await db
      .update(submissions)
      .set({
        title,
        description,
        artworkUrl,
        thumbnailUrl,
        canvasData,
        tags,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId))
      .returning()

    return NextResponse.json({
      submission: updatedSubmission,
    })
  } catch (error) {
    console.error("Failed to update submission:", error)
    return NextResponse.json(
      {error: "Failed to update submission"},
      {status: 500}
    )
  }
}

export async function DELETE(
  request: NextRequest,
  {params}: {params: {id: string}}
) {
  try {
    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        {error: "Authentication required"},
        {status: 401}
      )
    }

    const submissionId = params.id

    // Get existing submission to verify ownership
    const existingSubmission = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (existingSubmission.length === 0) {
      return NextResponse.json({error: "Submission not found"}, {status: 404})
    }

    // Only creator can delete their own submissions, and only if pending or rejected
    if (existingSubmission[0].creatorId !== user.id) {
      return NextResponse.json(
        {error: "Not authorized to delete this submission"},
        {status: 403}
      )
    }

    if (!["pending", "rejected"].includes(existingSubmission[0].status)) {
      return NextResponse.json(
        {error: "Cannot delete submission that is approved"},
        {status: 400}
      )
    }

    // Delete submission
    await db.delete(submissions).where(eq(submissions.id, submissionId))

    return NextResponse.json({
      message: "Submission deleted successfully",
    })
  } catch (error) {
    console.error("Failed to delete submission:", error)
    return NextResponse.json(
      {error: "Failed to delete submission"},
      {status: 500}
    )
  }
}
