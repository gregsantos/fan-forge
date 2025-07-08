import { getAssetStats } from '@/lib/data/assets'
import { getIpKits, getCampaigns } from '@/lib/data/campaigns'
import { getCurrentUser, getUserWithRoles, getUserBrandIds } from '@/lib/auth-utils'
import AssetsPageClient from './assets-page-client'
import OnboardingModal from '@/components/shared/onboarding-modal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Plus } from 'lucide-react'

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
    const brandIds = await getUserBrandIds(user.id)
    const showBrandCreation = isBrandAdmin && brandIds.length === 0

    // If user needs to create a brand first, show brand creation UI
    if (showBrandCreation) {
      return (
        <div className='container mx-auto p-6 space-y-8'>
          {/* Header */}
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Asset Library</h1>
            <p className='text-muted-foreground mt-2'>
              Upload and manage your brand assets for campaigns
            </p>
          </div>

          <Card className='border-0 shadow-lg bg-gradient-to-br from-gradient-purple/5 via-card to-gradient-pink/5'>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gradient-purple to-gradient-pink">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Create Your Brand First</CardTitle>
              <CardDescription className="text-base">
                To upload your brand assets, you need to set up your brand first.
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
    }

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
