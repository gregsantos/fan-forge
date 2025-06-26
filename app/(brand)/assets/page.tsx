import { getAssetStats } from '@/lib/data/assets'
import { getIpKits } from '@/lib/data/campaigns'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import AssetsPageClient from './assets-page-client'

export default async function AssetsPage() {
  try {
    // Get current user for brand filtering
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('Authentication required')
    }

    const [stats, ipKitsData] = await Promise.all([
      getAssetStats(user.id), // Pass user ID for brand filtering
      getIpKits({}) // Pass empty search params
    ])
    
    // Transform IP kits to match expected interface
    const availableIpKits = ipKitsData.ipKits.map(ipKit => ({
      id: ipKit.id,
      title: ipKit.name,
      description: ipKit.description || undefined
    }))
    
    return <AssetsPageClient initialStats={stats} availableIpKits={availableIpKits} />
  } catch (error) {
    console.error('Failed to load asset data:', error)
    
    // Check if it's an authentication error
    if (error instanceof Error && error.message === 'Authentication required') {
      return (
        <div className="container mx-auto py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground">Please log in to access the asset management page.</p>
          </div>
        </div>
      )
    }
    
    // Fallback to empty data in case of other errors
    const fallbackStats = {
      totalAssets: 0,
      totalIpKits: 0,
      categoryBreakdown: [],
      storageUsed: 0,
      storageLimit: 10 * 1024 * 1024 * 1024 // 10GB
    }
    
    return <AssetsPageClient initialStats={fallbackStats} availableIpKits={[]} />
  }
}
