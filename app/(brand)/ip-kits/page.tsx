import { getIpKits, getCampaigns } from "@/lib/data/campaigns"
import { getCurrentUser, getUserBrandIds, getUserWithRoles } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Package, Plus } from "lucide-react"
import Link from "next/link"
import IpKitsClient from "./ip-kits-client"
import OnboardingModal from "@/components/shared/onboarding-modal"

export default async function IpKitsPage() {
  // Get current user (server-side)
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/login")
  }

  try {
    // Get user's brand IDs and roles
    const brandIds = await getUserBrandIds(user.id)
    const userWithRoles = await getUserWithRoles(user.id)
    
    // Check if user is a brand admin
    const isBrandAdmin = userWithRoles?.roles?.some((r: any) => r.role.name === "brand_admin")
    
    if (brandIds.length === 0) {
      if (isBrandAdmin) {
        // Brand admin without brands - show onboarding modal
        return (
          <div className="container mx-auto py-8">
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Create Your Brand First</h3>
              <p className="text-muted-foreground mb-4">
                To create IP kits and organize your brand assets, you need to set up your brand first.
              </p>
              <Link href="/dashboard">
                <Button variant="gradient">
                  <Package className="mr-2 h-4 w-4" />
                  Go to Dashboard to Get Started
                </Button>
              </Link>
            </div>
          </div>
        )
      } else {
        // Creator or other role - show generic message
        return (
          <div className="container mx-auto py-8">
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Brand Access</h3>
              <p className="text-muted-foreground mb-4">
                You need to be associated with a brand to manage IP kits.
              </p>
              <Link href='/dashboard'>
                <Button>
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )
      }
    }

    // Check if user has campaigns (for consistent onboarding experience)
    const campaignsData = await getCampaigns({limit: "1"})
    const hasCampaigns = campaignsData.campaigns.length > 0

    // Fetch IP kits server-side using shared data layer
    const { ipKits } = await getIpKits({})
    
    // Transform to match client component interface
    const transformedIpKits = ipKits.map(kit => ({
      id: kit.id,
      name: kit.name,
      description: kit.description || undefined,
      published: kit.published || false,
      brand_name: kit.brand_name,
      asset_count: kit.asset_count,
      created_at: new Date(kit.created_at),
      updated_at: new Date(kit.updated_at),
    }))

    // Use the first brand's name for now
    const brandName = transformedIpKits[0]?.brand_name || "Your Brand"

    return <IpKitsClient ipKits={transformedIpKits} brandName={brandName} />
  } catch (error) {
    console.error("Failed to load IP kits:", error)
    
    // Return empty state on error
    return <IpKitsClient ipKits={[]} brandName="Your Brand" />
  }
}