import { getIpKits, getCampaigns } from "@/lib/data/campaigns"
import { getCurrentUser, getUserBrandIds, getUserWithRoles } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
          <div className='container mx-auto p-6 space-y-8'>
            {/* Header */}
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>IP Kits</h1>
              <p className='text-muted-foreground mt-2'>
                Organize your brand assets into collections for campaigns
              </p>
            </div>

            <Card className='border-0 shadow-lg bg-gradient-to-br from-green-500/5 via-card to-emerald-500/5'>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Create Your Brand First</CardTitle>
                <CardDescription className="text-base">
                  To create IP kits and organize your brand assets, you need to set up your brand first.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6 text-center">
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-gradient-blue/20 to-gradient-cyan/20 flex items-center justify-center">
                      <span className="text-gradient-blue font-bold">1</span>
                    </div>
                    <h4 className="font-medium">Create Brand</h4>
                    <p className="text-sm text-muted-foreground">Set up your brand identity and information</p>
                  </div>
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-gradient-purple/20 to-gradient-pink/20 flex items-center justify-center">
                      <span className="text-gradient-purple font-bold">2</span>
                    </div>
                    <h4 className="font-medium">Upload Assets</h4>
                    <p className="text-sm text-muted-foreground">Upload and organize your brand assets</p>
                  </div>
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                      <span className="text-green-600 font-bold">3</span>
                    </div>
                    <h4 className="font-medium">Create IP Kits</h4>
                    <p className="text-sm text-muted-foreground">Organize assets into collections for campaigns</p>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <OnboardingModal 
                    trigger={
                      <Button variant='gradient' size="lg" className='shadow-lg'>
                        <Plus className='mr-2 h-5 w-5' />
                        Create Your Brand
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
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