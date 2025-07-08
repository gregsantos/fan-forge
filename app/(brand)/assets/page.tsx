import { getAssetStats } from '@/lib/data/assets'
import { getIpKits, getCampaigns } from '@/lib/data/campaigns'
import { getCurrentUser, getUserWithRoles } from '@/lib/auth-utils'
import AssetsPageClient from './assets-page-client'
import OnboardingModal from '@/components/shared/onboarding-modal'

export default async function AssetsPage() {
  try {
    // Get current user and check role
    const user = await getCurrentUser()
    
    if (!user) {
      return (
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground">Please log in to access the asset management page.</p>
          </div>
        </div>
      )
    }

    const userWithRoles = await getUserWithRoles(user.id)
    const isBrandAdmin = userWithRoles?.roles?.some((r: any) => r.role.name === "brand_admin")

    const [stats, ipKitsData, campaignsData] = await Promise.all([
      getAssetStats(user.id), // Pass user ID for brand filtering
      getIpKits({}), // Pass empty search params
      getCampaigns({limit: "1"}) // Check if any campaigns exist
    ])
    
    const hasCampaigns = campaignsData.campaigns.length > 0
    
    // Transform IP kits to match expected interface
    const availableIpKits = ipKitsData.ipKits.map(ipKit => ({
      id: ipKit.id,
      title: ipKit.name,
      description: ipKit.description || undefined
    }))
    
    return <AssetsPageClient initialStats={stats} availableIpKits={availableIpKits} />
  } catch (error) {
    console.error('Failed to load asset data:', error)
    
    // Provide better error messaging
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Unable to Load Assets</h1>
          <p className="text-muted-foreground mb-4">
            There was a problem loading your asset library. This could be due to:
          </p>
          <ul className="text-sm text-muted-foreground mb-6 space-y-1">
            <li>• Network connection issues</li>
            <li>• Temporary server problems</li>
            <li>• Missing brand permissions</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      </div>
    )
  }
}
