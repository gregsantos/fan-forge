import { notFound } from "next/navigation"
import { CampaignDiscoverClient } from "./campaign-discover-client"
import { getCampaignById } from "@/lib/data/campaigns"

interface CampaignDiscoverPageProps {
  params: {
    id: string
  }
}

export default async function CampaignDiscoverPage({ params }: CampaignDiscoverPageProps) {
  const campaign = await getCampaignById(params.id)
  
  if (!campaign) {
    notFound()
  }

  return <CampaignDiscoverClient campaign={campaign} />
}