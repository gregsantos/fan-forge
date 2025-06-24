import { getAssetStats } from '@/lib/data/assets'
import { getIpKits } from '@/lib/data/campaigns'
import AssetsPageClient from './assets-page-client'

export default async function AssetsPage() {
  try {
    const [stats, ipKitsData] = await Promise.all([
      getAssetStats(),
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
    
    // Fallback to mock data in case of error
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
