import { notFound } from "next/navigation"
import { CampaignSubmissionsClient } from "./submissions-client"
import { getCampaignById, getCampaignSubmissions } from "@/lib/data/campaigns"

interface CampaignSubmissionsPageProps {
  params: {
    id: string
  }
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function CampaignSubmissionsPage({ params, searchParams }: CampaignSubmissionsPageProps) {
  const campaign = await getCampaignById(params.id)
  
  if (!campaign) {
    notFound()
  }

  // Convert searchParams to the format expected by getCampaignSubmissions
  const normalizedSearchParams = Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value
    ])
  )

  const submissionsData = await getCampaignSubmissions(params.id, normalizedSearchParams)

  return <CampaignSubmissionsClient campaign={campaign} initialData={submissionsData} />
}