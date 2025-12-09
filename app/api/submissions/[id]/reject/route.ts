import { NextRequest, NextResponse } from "next/server"
import { db, submissions, campaigns, users, auditLogs, notifications } from "@/db"
import { eq } from "drizzle-orm"
import { createServerClient } from '@supabase/ssr'

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
  return user
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Get current user
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const submissionId = id
    const body = await request.json()
    const { feedback, rating } = body

    if (!feedback || feedback.trim().length === 0) {
      return NextResponse.json(
        { error: "Feedback is required when rejecting a submission" },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      )
    }

    const { submission, campaign, creator } = submissionResult[0]

    // Verify user has permission to reject (brand admin for this campaign)
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    // TODO: Add proper role-based authorization check
    // For now, we'll assume any authenticated user can reject
    // In production, check if user is brand_admin for this campaign's brand

    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: "Can only reject pending submissions" },
        { status: 400 }
      )
    }

    // Update submission with rejection
    const [updatedSubmission] = await db
      .update(submissions)
      .set({
        status: 'rejected',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        feedback: feedback,
        rating: rating || null,
        isPublic: false, // Keep private when rejected
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId))
      .returning()

    // Create audit log entry
    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'submission_rejected',
      entityType: 'submission',
      entityId: submissionId,
      newValues: { 
        status: 'rejected',
        reviewedBy: user.id,
        feedback: feedback,
        rating: rating || null
      },
    })

    // Send notification to creator
    if (creator) {
      await db.insert(notifications).values({
        userId: creator.id,
        type: 'submission_rejected',
        title: 'Submission Needs Changes',
        message: `Your submission "${submission.title}" needs some changes. Please review the feedback and resubmit.`,
        data: {
          submissionId,
          campaignId: submission.campaignId,
          feedback,
        },
      })
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

    return NextResponse.json({
      success: true,
      submission: {
        ...updatedSubmissionResult[0].submission,
        campaign: updatedSubmissionResult[0].campaign,
        creator: updatedSubmissionResult[0].creator,
      }
    })

  } catch (error) {
    console.error('Failed to reject submission:', error)
    return NextResponse.json(
      { error: "Failed to reject submission" },
      { status: 500 }
    )
  }
}