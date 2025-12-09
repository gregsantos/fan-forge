import { notFound } from "next/navigation"
import { CampaignSubmissionsClient } from "./submissions-client"
import { getCampaignById, getCampaignSubmissions } from "@/lib/data/campaigns"

interface CampaignSubmissionsPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CampaignSubmissionsPage({ params, searchParams }: CampaignSubmissionsPageProps) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const campaign = await getCampaignById(id)
  
  if (!campaign) {
    notFound()
  }

  // Convert searchParams to the format expected by getCampaignSubmissions
  const normalizedSearchParams = Object.fromEntries(
    Object.entries(resolvedSearchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value
    ])
  )

  const submissionsData = await getCampaignSubmissions(id, normalizedSearchParams)

  return <CampaignSubmissionsClient campaign={campaign} initialData={submissionsData} />
}