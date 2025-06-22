import { notFound } from "next/navigation"
import { CampaignDetailClient } from "./campaign-detail-client"

async function getCampaign(id: string) {
  const apiUrl = `/api/campaigns/${id}`
  
  try {
    const response = await fetch(new URL(apiUrl, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'), { 
      cache: 'no-store' 
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to fetch campaign')
    }
    
    const data = await response.json()
    return data.campaign
  } catch (error) {
    console.error('Campaign fetch error:', error)
    return null
  }
}

interface CampaignDetailPageProps {
  params: {
    id: string
  }
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const campaign = await getCampaign(params.id)
  
  if (!campaign) {
    notFound()
  }

  return <CampaignDetailClient campaign={campaign} />
}