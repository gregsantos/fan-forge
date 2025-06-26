import { getCreatorSubmissions } from "@/lib/data/campaigns"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import MySubmissionsClient from "./my-submissions-client"

export default async function MySubmissionsPage() {
  // Get current user (server-side)
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/login")
  }

  try {
    // Fetch submissions server-side using shared data layer
    const { submissions } = await getCreatorSubmissions(user.id, {})

    // Transform to match client component interface
    const transformedSubmissions = submissions.map(sub => ({
      id: sub.id,
      title: sub.title,
      description: sub.description || "",
      status: sub.status as "pending" | "approved" | "rejected" | "withdrawn",
      artworkUrl: sub.artworkUrl || "",
      createdAt: new Date(sub.createdAt),
      updatedAt: new Date(sub.updatedAt),
      feedback: sub.feedback || undefined,
      campaignId: sub.campaignId,
      campaign: sub.campaign,
    }))

    return <MySubmissionsClient submissions={transformedSubmissions} />
  } catch (error) {
    console.error("Failed to load submissions:", error)
    
    // Return empty state on error
    return <MySubmissionsClient submissions={[]} />
  }
}
