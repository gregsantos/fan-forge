import { getCampaignById } from "@/lib/data/campaigns"
import { notFound } from "next/navigation"
import EditCampaignClient from "./edit-campaign-client"
import { db, ipKits } from "@/db"
import { desc, count, eq } from "drizzle-orm"

interface IPKit {
  id: string
  name: string
  description: string
  assetCount: number
  isPublished: boolean
}

async function getIpKits(): Promise<IPKit[]> {
  try {
    const ipKitResults = await db
      .select({
        ipKit: ipKits,
        assetCount: count(),
      })
      .from(ipKits)
      .where(eq(ipKits.isPublished, true))
      .groupBy(ipKits.id)
      .orderBy(desc(ipKits.createdAt))
      .limit(100)

    return ipKitResults.map(result => ({
      id: result.ipKit.id,
      name: result.ipKit.name,
      description: result.ipKit.description || "",
      assetCount: result.assetCount || 0,
      isPublished: result.ipKit.isPublished ?? false,
    }))
  } catch (error) {
    console.error("Failed to fetch IP kits:", error)
    return []
  }
}

export default async function EditCampaignPage({
  params,
}: {
  params: { id: string }
}) {
  // Fetch campaign data and IP kits in parallel
  const [campaignData, ipKitsData] = await Promise.all([
    getCampaignById(params.id),
    getIpKits(),
  ])

  if (!campaignData) {
    notFound()
  }

  // Format campaign data for the client component
  const campaign = {
    id: campaignData.id,
    title: campaignData.title,
    description: campaignData.description,
    guidelines: campaignData.guidelines || "",
    ipKitId: campaignData.ipKitId,
    status: campaignData.status,
    startDate: campaignData.startDate,
    endDate: campaignData.endDate,
    maxSubmissions: campaignData.maxSubmissions,
    rewardAmount: campaignData.rewardAmount,
    rewardCurrency: campaignData.rewardCurrency || "USD",
    briefDocument: campaignData.briefDocument,
    submissionCount: 0, // TODO: Add submission count to getCampaignById
    createdAt: campaignData.createdAt,
    updatedAt: campaignData.updatedAt,
  }

  return (
    <EditCampaignClient 
      campaign={campaign} 
      ipKits={ipKitsData} 
    />
  )
}