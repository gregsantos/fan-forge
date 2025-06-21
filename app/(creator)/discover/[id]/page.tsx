import { notFound } from "next/navigation"
import { CampaignDiscoverClient } from "./campaign-discover-client"
import { db, campaigns, brands, assets, ipKits } from "@/db"
import { eq } from "drizzle-orm"
import { mockCampaigns } from "@/lib/mock-data"

export async function generateStaticParams() {
  // For now, use mock data for static generation
  // TODO: Replace with real database query once auth and data are set up
  return mockCampaigns.map((campaign) => ({
    id: campaign.id,
  }))
}

interface CampaignDiscoverPageProps {
  params: {
    id: string
  }
}

export default async function CampaignDiscoverPage({ params }: CampaignDiscoverPageProps) {
  // For development, try database first, then fallback to mock data
  try {
    // Try to fetch from database if the ID looks like a UUID
    if (params.id.length > 10 && params.id.includes('-')) {
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

      if (campaignResult.length > 0) {
        // Database found - process real data
        const campaignAssets = campaignResult[0].ipKit ? await db
          .select()
          .from(assets)
          .where(eq(assets.ipKitId, campaignResult[0].ipKit.id)) : []

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
          submissionCount: 0,
        }

        return <CampaignDiscoverClient campaign={campaign} />
      }
    }
  } catch (error) {
    console.error('Database error, falling back to mock data:', error)
  }

  // Fallback to mock data for development
  const campaign = mockCampaigns.find(c => c.id === params.id)
  
  if (!campaign) {
    notFound()
  }

  return <CampaignDiscoverClient campaign={campaign} />
}