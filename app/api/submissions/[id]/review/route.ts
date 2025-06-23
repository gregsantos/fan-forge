import { NextRequest, NextResponse } from "next/server"
import { db, submissions, reviews, users, auditLogs, notifications } from "@/db"
import { eq, and } from "drizzle-orm"
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { action, feedback, rating, internalNotes } = body

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    // Require feedback for rejections
    if (action === 'reject' && !feedback) {
      return NextResponse.json(
        { error: "Feedback is required when rejecting a submission" },
        { status: 400 }
      )
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      )
    }

    // Get submission with creator details
    const submissionResults = await db
      .select({
        submission: submissions,
        creator: {
          id: users.id,
          email: users.email,
          displayName: users.displayName,
        }
      })
      .from(submissions)
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .where(eq(submissions.id, params.id))
      .limit(1)

    if (submissionResults.length === 0) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      )
    }

    const { submission, creator } = submissionResults[0]

    // Check if submission is in pending status
    if (submission.status !== 'pending') {
      return NextResponse.json(
        { error: "Only pending submissions can be reviewed" },
        { status: 400 }
      )
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const now = new Date()

    // Start a transaction to update submission, create review record, and log audit
    const [updatedSubmission] = await db
      .update(submissions)
      .set({
        status: newStatus,
        reviewedBy: user.id,
        reviewedAt: now,
        feedback: feedback || null,
        rating: rating || null,
        updatedAt: now,
        ...(action === 'approve' ? { isPublic: true } : {}), // Make approved submissions public
      })
      .where(eq(submissions.id, params.id))
      .returning()

    // Create review record for audit trail
    const [reviewRecord] = await db
      .insert(reviews)
      .values({
        submissionId: params.id,
        reviewerId: user.id,
        status: newStatus,
        feedback: feedback || null,
        rating: rating || null,
        internalNotes: internalNotes || null,
      })
      .returning()

    // Create audit log entry
    await db
      .insert(auditLogs)
      .values({
        userId: user.id,
        action: `submission_${action}`,
        entityType: 'submission',
        entityId: params.id,
        oldValues: { status: 'pending' },
        newValues: { 
          status: newStatus, 
          reviewedBy: user.id, 
          reviewedAt: now,
          feedback: feedback || null,
          rating: rating || null 
        },
        metadata: { 
          reviewId: reviewRecord.id,
          creatorId: submission.creatorId 
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      })

    // Create notification for the creator
    if (creator) {
      const notificationTitle = action === 'approve' 
        ? '🎉 Submission Approved!'
        : '📝 Submission Needs Revision'
      
      const notificationMessage = action === 'approve'
        ? `Your submission "${submission.title}" has been approved and is now live!`
        : `Your submission "${submission.title}" requires some adjustments. Please check the feedback and resubmit.`

      await db
        .insert(notifications)
        .values({
          userId: submission.creatorId,
          type: `submission_${action}`,
          title: notificationTitle,
          message: notificationMessage,
          data: {
            submissionId: params.id,
            submissionTitle: submission.title,
            campaignId: submission.campaignId,
            feedback: feedback || null,
            rating: rating || null,
          },
        })
    }

    // Return the updated submission with review details
    return NextResponse.json({
      submission: updatedSubmission,
      review: reviewRecord,
      message: `Submission ${action}d successfully`,
    })

  } catch (error) {
    console.error('Failed to review submission:', error)
    return NextResponse.json(
      { error: "Failed to process review" },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch review history for a submission
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user for authorization
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Get all reviews for this submission
    const reviewHistory = await db
      .select({
        review: reviews,
        reviewer: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
        }
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .where(eq(reviews.submissionId, params.id))
      .orderBy(reviews.createdAt)

    return NextResponse.json({
      reviews: reviewHistory.map(r => ({
        ...r.review,
        reviewer: r.reviewer,
      }))
    })

  } catch (error) {
    console.error('Failed to fetch review history:', error)
    return NextResponse.json(
      { error: "Failed to fetch review history" },
      { status: 500 }
    )
  }
}