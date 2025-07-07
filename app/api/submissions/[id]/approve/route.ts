import {NextRequest, NextResponse} from "next/server"
import {db, submissions, campaigns, users, auditLogs, notifications} from "@/db"
import {eq} from "drizzle-orm"
import {createServerClient} from "@supabase/ssr"
import {getSubmissionAssetIpIds} from "@/lib/data/submissions"
import {registerApprovedSubmission} from "@/lib/services/story-protocol"

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

export async function POST(
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
    const {feedback, rating} = body

    // Get submission with campaign info
    const submissionResult = await db
      .select({
        submission: submissions,
        campaign: campaigns,
        creator: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
        },
      })
      .from(submissions)
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (submissionResult.length === 0) {
      return NextResponse.json({error: "Submission not found"}, {status: 404})
    }

    const {submission, campaign, creator} = submissionResult[0]

    // Verify user has permission to approve (brand admin for this campaign)
    if (!campaign) {
      return NextResponse.json({error: "Campaign not found"}, {status: 404})
    }

    // TODO: Add proper role-based authorization check
    // For now, we'll assume any authenticated user can approve
    // In production, check if user is brand_admin for this campaign's brand

    if (submission.status !== "pending") {
      return NextResponse.json(
        {error: "Can only approve pending submissions"},
        {status: 400}
      )
    }

    // Note: Approved submissions become part of public showcase, not IP Kits
    // IP Kits remain brand-managed asset collections only

    // Update submission with approval
    const [updatedSubmission] = await db
      .update(submissions)
      .set({
        status: "approved",
        reviewedBy: user.id,
        reviewedAt: new Date(),
        feedback: feedback || null,
        rating: rating || null,
        isPublic: true, // Make public when approved for community showcase
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId))
      .returning()

    // Create audit log entry
    await db.insert(auditLogs).values({
      userId: user.id,
      action: "submission_approved",
      entityType: "submission",
      entityId: submissionId,
      newValues: {
        status: "approved",
        reviewedBy: user.id,
        feedback: feedback || null,
        rating: rating || null,
        isPublic: true,
      },
    })

    // Send notification to creator
    if (creator) {
      await db.insert(notifications).values({
        userId: creator.id,
        type: "submission_approved",
        title: "Submission Approved!",
        message: `Your submission "${submission.title}" has been approved and is now featured in the community showcase!`,
        data: {
          submissionId,
          campaignId: submission.campaignId,
        },
      })
    }

    // Log and verify all submission asset ipIds for external service integration
    try {
      const assetIpIds = await getSubmissionAssetIpIds(submissionId)
      console.log(
        `🎉 SUBMISSION APPROVED - Asset IP IDs for submission ${submissionId}:`,
        {
          submissionId,
          submissionTitle: submission.title,
          campaignId: submission.campaignId,
          assetIpIds,
          totalUniqueIpIds: assetIpIds.length,
          timestamp: new Date().toISOString(),
        }
      )

      if (assetIpIds.length === 0) {
        console.warn(
          `⚠️  WARNING: Approved submission ${submissionId} has no asset IP IDs. This may indicate missing asset relationships.`
        )
      }
    } catch (error) {
      console.error(
        `❌ ERROR: Failed to retrieve asset IP IDs for approved submission ${submissionId}:`,
        error
      )
    }

    // Get updated submission with relations for response
    const updatedSubmissionResult = await db
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
      .where(eq(submissions.id, submissionId))
      .limit(1)

    // Automatically register as derivative IP asset on Story Protocol
    console.log(
      `🚀 Starting automatic Story Protocol registration for approved submission ${submissionId}`
    )

    try {
      const storyResult = await registerApprovedSubmission(submissionId)

      if (storyResult.success) {
        console.log(
          `✅ Successfully registered submission ${submissionId} as derivative IP asset:`,
          {
            ipId: storyResult.ipId,
            txHash: storyResult.txHash,
          }
        )
      } else {
        console.error(
          `❌ Failed to register submission ${submissionId} on Story Protocol:`,
          storyResult.error
        )
        // Continue with approval even if Story Protocol registration fails
        // This ensures the approval process isn't blocked by blockchain issues
      }
    } catch (storyError) {
      console.error(
        `❌ Error during Story Protocol registration for submission ${submissionId}:`,
        storyError
      )
      // Continue with approval even if Story Protocol registration fails
    }

    return NextResponse.json({
      success: true,
      submission: {
        ...updatedSubmissionResult[0].submission,
        campaign: updatedSubmissionResult[0].campaign,
        creator: updatedSubmissionResult[0].creator,
      },
    })
  } catch (error) {
    console.error("Failed to approve submission:", error)
    return NextResponse.json(
      {error: "Failed to approve submission"},
      {status: 500}
    )
  }
}
