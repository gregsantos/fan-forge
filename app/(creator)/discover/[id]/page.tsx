import { notFound } from "next/navigation"
import { CampaignDiscoverClient } from "./campaign-discover-client"
import { db, campaigns, brands, ipKits, assets } from "@/db"
import { eq } from "drizzle-orm"

async function getCampaign(id: string) {
  try {
    // Get campaign with relations directly from database
    const campaignWithDetails = await db
      .select({
        campaign: campaigns,
        brand: brands,
        ipKit: ipKits,
      })
      .from(campaigns)
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .leftJoin(ipKits, eq(campaigns.ipKitId, ipKits.id))
      .where(eq(campaigns.id, id))
      .limit(1)

    if (campaignWithDetails.length === 0) {
      return null
    }

    const result = campaignWithDetails[0]

    // Get assets for the campaign's IP kit
    const campaignAssets = result.ipKit ? await db
      .select()
      .from(assets)
      .where(eq(assets.ipKitId, result.ipKit.id)) : []

    return {
      id: result.campaign.id,
      title: result.campaign.title,
      description: result.campaign.description,
      guidelines: result.campaign.guidelines,
      brand_name: result.brand?.name,
      status: result.campaign.status,
      deadline: result.campaign.endDate,
      created_at: result.campaign.createdAt,
      assets: campaignAssets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        url: asset.url,
        category: asset.category,
        metadata: asset.metadata,
      }))
    }
  } catch (error) {
    console.error('Campaign fetch error:', error)
    return null
  }
}

interface CampaignDiscoverPageProps {
  params: {
    id: string
  }
}

export default async function CampaignDiscoverPage({ params }: CampaignDiscoverPageProps) {
  const campaign = await getCampaign(params.id)
  
  if (!campaign) {
    notFound()
  }

  return <CampaignDiscoverClient campaign={campaign} />
}