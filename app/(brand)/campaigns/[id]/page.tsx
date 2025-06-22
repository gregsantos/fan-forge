import { notFound } from "next/navigation"
import { CampaignDetailClient } from "./campaign-detail-client"
import { getCampaignById } from "@/lib/data/campaigns"

interface CampaignDetailPageProps {
  params: {
    id: string
  }
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const campaign = await getCampaignById(params.id)
  
  if (!campaign) {
    notFound()
  }

  return <CampaignDetailClient campaign={campaign} />
}