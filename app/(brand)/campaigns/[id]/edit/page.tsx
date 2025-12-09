import { getCampaignById, getIpKits } from "@/lib/data/campaigns"
import { notFound } from "next/navigation"
import EditCampaignClient from "./edit-campaign-client"

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Fetch campaign data and IP kits in parallel
  const [campaignData, ipKitsResponse] = await Promise.all([
    getCampaignById(id),
    getIpKits({ published: "true" }),
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

  // Convert the response format to match the expected client component format
  const ipKitsData = ipKitsResponse.ipKits.map(ipKit => ({
    id: ipKit.id,
    name: ipKit.name,
    description: ipKit.description || "",
    assetCount: ipKit.asset_count,
    isPublished: ipKit.published ?? false,
  }))

  return (
    <EditCampaignClient 
      campaign={campaign} 
      ipKits={ipKitsData} 
    />
  )
}