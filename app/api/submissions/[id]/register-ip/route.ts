import {NextRequest, NextResponse} from "next/server"
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

    // Dynamically import Story Protocol service to avoid build-time issues
    const { isSubmissionEligibleForRegistration } = await import("@/lib/services/story-protocol")
    
    // Check if submission is eligible for registration
    const eligibility = await isSubmissionEligibleForRegistration(submissionId)
    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error:
            eligibility.reason || "Submission not eligible for registration",
        },
        {status: 400}
      )
    }

    // Register the submission as derivative IP asset
    console.log(
      `🚀 Starting Story Protocol registration for submission ${submissionId}`
    )
    const { registerApprovedSubmission } = await import("@/lib/services/story-protocol")
    const result = await registerApprovedSubmission(submissionId)

    if (!result.success) {
      return NextResponse.json(
        {error: result.error || "Registration failed"},
        {status: 500}
      )
    }

    console.log(
      `✅ Successfully registered submission ${submissionId} as IP asset`
    )

    return NextResponse.json({
      success: true,
      message: "Submission registered as derivative IP asset",
      data: {
        txHash: result.txHash,
        ipId: result.ipId,
        submissionId,
      },
    })
  } catch (error) {
    console.error("Failed to register submission on Story Protocol:", error)
    return NextResponse.json(
      {error: "Failed to register submission on Story Protocol"},
      {status: 500}
    )
  }
}

export async function GET(
  request: NextRequest,
  {params}: {params: {id: string}}
) {
  try {
    const submissionId = params.id

    // Dynamically import Story Protocol service to avoid build-time issues
    const { isSubmissionEligibleForRegistration } = await import("@/lib/services/story-protocol")

    // Check eligibility status
    const eligibility = await isSubmissionEligibleForRegistration(submissionId)

    return NextResponse.json({
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      submissionId,
    })
  } catch (error) {
    console.error("Failed to check registration eligibility:", error)
    return NextResponse.json(
      {error: "Failed to check registration eligibility"},
      {status: 500}
    )
  }
}
