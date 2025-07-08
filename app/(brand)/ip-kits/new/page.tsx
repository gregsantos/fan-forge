import { getCurrentUser, getUserBrandIds, getUserWithRoles } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import NewIpKitClient from "./new-ip-kit-client"
import OnboardingModal from "@/components/shared/onboarding-modal"
import { Package, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function NewIpKitPage() {
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
    
    if (brandIds.length === 0 && !isBrandAdmin) {
      // Only block non-brand admins
      return (
        <div className="container mx-auto py-8 max-w-4xl">
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Brand Access</h3>
            <p className="text-muted-foreground mb-4">
              You need to be associated with a brand to create IP kits.
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

    // Let brand admins through to the client component 
    // which will handle brand detection and creation flow
    return <NewIpKitClient />
  } catch (error) {
    console.error("Failed to load IP kit creation page:", error)
    
    // Return error state
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center py-8">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Unable to Load Page</h3>
          <p className="text-muted-foreground mb-4">
            There was a problem loading the IP kit creation page. Please try again.
          </p>
          <Link href='/ip-kits'>
            <Button>
              Back to IP Kits
            </Button>
          </Link>
        </div>
      </div>
    )
  }
}