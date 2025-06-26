import { getIpKits } from "@/lib/data/campaigns"
import { getCurrentUser, getUserBrandIds } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"
import IpKitsClient from "./ip-kits-client"

export default async function IpKitsPage() {
  // Get current user (server-side)
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/login")
  }

  try {
    // Get user's brand IDs
    const brandIds = await getUserBrandIds(user.id)
    
    if (brandIds.length === 0) {
      return (
        <div className="container mx-auto py-8">
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Brand Access</h3>
            <p className="text-muted-foreground mb-4">
              You need to be associated with a brand to manage IP kits.
            </p>
            <Button onClick={() => (window.location.href = '/dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      )
    }

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