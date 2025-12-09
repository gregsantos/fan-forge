import { notFound } from "next/navigation"
import { CampaignDiscoverClient } from "./campaign-discover-client"
import { getCampaignById } from "@/lib/data/campaigns"

interface CampaignDiscoverPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CampaignDiscoverPage({ params }: CampaignDiscoverPageProps) {
  const { id } = await params
  const campaign = await getCampaignById(id)
  
  if (!campaign) {
    notFound()
  }

  return <CampaignDiscoverClient campaign={campaign} />
}