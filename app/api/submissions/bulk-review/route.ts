import { NextRequest, NextResponse } from "next/server"
import { db, submissions, reviews, users, auditLogs, notifications } from "@/db"
import { eq, inArray, and } from "drizzle-orm"
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
    const { submissionIds, action, feedback, rating, internalNotes } = body

    // Validate input
    if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
      return NextResponse.json(
        { error: "submissionIds must be a non-empty array" },
        { status: 400 }
      )
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      )
    }

    // Require feedback for bulk rejections
    if (action === 'reject' && !feedback) {
      return NextResponse.json(
        { error: "Feedback is required when rejecting submissions" },
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

    // Limit bulk operations to prevent abuse
    if (submissionIds.length > 50) {
      return NextResponse.json(
        { error: "Cannot process more than 50 submissions at once" },
        { status: 400 }
      )
    }

    // Get submissions with creator details
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
      .where(inArray(submissions.id, submissionIds))

    if (submissionResults.length === 0) {
      return NextResponse.json(
        { error: "No submissions found" },
        { status: 404 }
      )
    }

    // Filter only pending submissions
    const pendingSubmissions = submissionResults.filter(
      result => result.submission.status === 'pending'
    )

    if (pendingSubmissions.length === 0) {
      return NextResponse.json(
        { error: "No pending submissions found to process" },
        { status: 400 }
      )
    }

    const pendingIds = pendingSubmissions.map(s => s.submission.id)
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const now = new Date()

    // Update all pending submissions
    const updatedSubmissions = await db
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
      .where(inArray(submissions.id, pendingIds))
      .returning()

    // Create review records for each submission
    const reviewInserts = pendingIds.map(submissionId => ({
      submissionId,
      reviewerId: user.id,
      status: newStatus as 'approved' | 'rejected',
      feedback: feedback || null,
      rating: rating || null,
      internalNotes: internalNotes || null,
    }))

    const reviewRecords = await db
      .insert(reviews)
      .values(reviewInserts)
      .returning()

    // Create audit log entries
    const auditInserts = pendingSubmissions.map((subResult, index) => ({
      userId: user.id,
      action: `bulk_submission_${action}`,
      entityType: 'submission',
      entityId: subResult.submission.id,
      oldValues: { status: 'pending' },
      newValues: { 
        status: newStatus, 
        reviewedBy: user.id, 
        reviewedAt: now,
        feedback: feedback || null,
        rating: rating || null 
      },
      metadata: { 
        reviewId: reviewRecords[index]?.id,
        creatorId: subResult.submission.creatorId,
        bulkOperation: true,
        totalProcessed: pendingIds.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    }))

    await db.insert(auditLogs).values(auditInserts)

    // Create notifications for creators
    const notificationInserts = pendingSubmissions
      .filter(result => result.creator) // Only for submissions with valid creators
      .map(result => {
        const notificationTitle = action === 'approve' 
          ? '🎉 Submission Approved!'
          : '📝 Submission Needs Revision'
        
        const notificationMessage = action === 'approve'
          ? `Your submission "${result.submission.title}" has been approved and is now live!`
          : `Your submission "${result.submission.title}" requires some adjustments. Please check the feedback and resubmit.`

        return {
          userId: result.submission.creatorId,
          type: `submission_${action}`,
          title: notificationTitle,
          message: notificationMessage,
          data: {
            submissionId: result.submission.id,
            submissionTitle: result.submission.title,
            campaignId: result.submission.campaignId,
            feedback: feedback || null,
            rating: rating || null,
            bulkReview: true,
          },
        }
      })

    if (notificationInserts.length > 0) {
      await db.insert(notifications).values(notificationInserts)
    }

    // Calculate results summary
    const processed = pendingIds.length
    const skipped = submissionIds.length - processed
    const notFound = submissionIds.length - submissionResults.length

    return NextResponse.json({
      message: `Bulk ${action} completed successfully`,
      summary: {
        requested: submissionIds.length,
        processed,
        skipped, // Non-pending submissions
        notFound, // Invalid submission IDs
      },
      processedSubmissions: updatedSubmissions.map(sub => sub.id),
      reviews: reviewRecords.map(review => review.id),
    })

  } catch (error) {
    console.error('Failed to bulk review submissions:', error)
    return NextResponse.json(
      { error: "Failed to process bulk review" },
      { status: 500 }
    )
  }
}