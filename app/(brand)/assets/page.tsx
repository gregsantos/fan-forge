import { getAssetStats } from '@/lib/data/assets'
import AssetsPageClient from './assets-page-client'

export default async function AssetsPage() {
  try {
    const stats = await getAssetStats()
    const mockIpKitId = "867dc972-85c3-4f70-aa4e-cf0e78b675a4" // Still used for uploads
    
    return <AssetsPageClient initialStats={stats} mockIpKitId={mockIpKitId} />
  } catch (error) {
    console.error('Failed to load asset stats:', error)
    
    // Fallback to mock data in case of error
    const fallbackStats = {
      totalAssets: 0,
      totalIpKits: 0,
      categoryBreakdown: [],
      storageUsed: 0,
      storageLimit: 10 * 1024 * 1024 * 1024 // 10GB
    }
    
    return <AssetsPageClient initialStats={fallbackStats} mockIpKitId="867dc972-85c3-4f70-aa4e-cf0e78b675a4" />
  }
}
