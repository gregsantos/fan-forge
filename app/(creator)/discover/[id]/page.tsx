import { notFound } from "next/navigation"
import { CampaignDiscoverClient } from "./campaign-discover-client"

async function getCampaign(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  
  try {
    const response = await fetch(`${baseUrl}/api/campaigns/${id}`, { 
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