import { notFound } from "next/navigation"
import { CampaignDiscoverClient } from "./campaign-discover-client"
import { db, campaigns, brands, assets, ipKits } from "@/db"
import { eq } from "drizzle-orm"

export async function generateStaticParams() {
  try {
    const allCampaigns = await db
      .select({ id: campaigns.id })
      .from(campaigns)
      .where(eq(campaigns.status, 'active'))
    
    return allCampaigns.map((campaign) => ({
      id: campaign.id,
    }))
  } catch (error) {
    console.error('Error generating static params:', error)
    return []
  }
}

interface CampaignDiscoverPageProps {
  params: {
    id: string
  }
}

export default async function CampaignDiscoverPage({ params }: CampaignDiscoverPageProps) {
  try {
    // Fetch campaign with related data
    const campaignResult = await db
      .select({
        campaign: campaigns,
        brand: brands,
        ipKit: ipKits,
      })
      .from(campaigns)
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .leftJoin(ipKits, eq(campaigns.ipKitId, ipKits.id))
      .where(eq(campaigns.id, params.id))
      .limit(1)

    if (campaignResult.length === 0) {
      notFound()
    }

    // Fetch campaign assets if ipKit exists
    const campaignAssets = campaignResult[0].ipKit ? await db
      .select()
      .from(assets)
      .where(eq(assets.ipKitId, campaignResult[0].ipKit.id)) : []

    // Get submission count for this campaign (placeholder for now)
    const submissionCount = 0

    const brandData = campaignResult[0].brand!
    const ipKitData = campaignResult[0].ipKit
    const campaignData = campaignResult[0].campaign
    const campaign = {
      ...campaignData,
      description: campaignData.description || '',
      guidelines: campaignData.guidelines || undefined,
      briefDocument: campaignData.briefDocument || undefined,
      ipKitId: campaignData.ipKitId || undefined,
      startDate: campaignData.startDate || undefined,
      endDate: campaignData.endDate || undefined,
      maxSubmissions: campaignData.maxSubmissions || undefined,
      rewardAmount: campaignData.rewardAmount || undefined,
      rewardCurrency: campaignData.rewardCurrency || undefined,
      featuredUntil: campaignData.featuredUntil || undefined,
      featured: campaignData.featuredUntil ? new Date() < campaignData.featuredUntil : false,
      brand: {
        ...brandData,
        description: brandData.description || undefined,
        logoUrl: brandData.logoUrl || undefined,
        website: brandData.website || undefined,
        contactEmail: brandData.contactEmail || undefined,
      },
      ipKit: ipKitData ? {
        ...ipKitData,
        description: ipKitData.description || undefined,
        guidelines: ipKitData.guidelines || undefined,
        isPublished: ipKitData.isPublished || false,
        version: ipKitData.version || 1,
      } : undefined,
      assets: campaignAssets.map(asset => ({
        ...asset,
        thumbnailUrl: asset.thumbnailUrl || undefined,
        tags: asset.tags || [],
        uploadedBy: asset.uploadedBy || undefined,
      })),
      submissionCount,
    }

    return <CampaignDiscoverClient campaign={campaign} />
  } catch (error) {
    console.error('Error fetching campaign:', error)
    notFound()
  }
}