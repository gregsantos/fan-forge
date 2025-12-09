import { getCampaigns } from "@/lib/data/campaigns"
import DiscoverClient from "./discover-client"

interface SearchParams {
  search?: string
  status?: string
  page?: string
  featured?: string
  limit?: string
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  try {
    const resolvedSearchParams = await searchParams
    // Fetch initial campaigns and featured campaigns server-side
    const [campaignsData, featuredData] = await Promise.all([
      getCampaigns({ ...resolvedSearchParams, page: resolvedSearchParams.page || '1' }),
      getCampaigns({ featured: 'true', limit: '3' })
    ])

    // Transform campaigns to match client component interface
    const transformedCampaigns = campaignsData.campaigns.map(campaign => ({
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      brand_name: campaign.brand_name,
      status: campaign.status,
      deadline: campaign.deadline,
      asset_count: campaign.asset_count,
      submission_count: campaign.submission_count,
      thumbnail_url: campaign.thumbnail_url || "",
      featured: campaign.featured,
    }))

    const transformedFeaturedCampaigns = featuredData.campaigns.map(campaign => ({
      id: campaign.id,
      title: campaign.title,
      description: campaign.description,
      brand_name: campaign.brand_name,
      status: campaign.status,
      deadline: campaign.deadline,
      asset_count: campaign.asset_count,
      submission_count: campaign.submission_count,
      thumbnail_url: campaign.thumbnail_url || "",
      featured: campaign.featured,
    }))

    return (
      <DiscoverClient 
        initialCampaigns={transformedCampaigns}
        initialFeaturedCampaigns={transformedFeaturedCampaigns}
      />
    )
  } catch (error) {
    console.error("Failed to load campaigns:", error)
    
    // Return empty state on error
    return (
      <DiscoverClient 
        initialCampaigns={[]}
        initialFeaturedCampaigns={[]}
      />
    )
  }
}