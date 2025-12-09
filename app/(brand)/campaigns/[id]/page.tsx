import { notFound } from "next/navigation"
import { CampaignDetailClient } from "./campaign-detail-client"
import { getCampaignById } from "@/lib/data/campaigns"

interface CampaignDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params
  const campaign = await getCampaignById(id)
  
  if (!campaign) {
    notFound()
  }

  return <CampaignDetailClient campaign={campaign} />
}