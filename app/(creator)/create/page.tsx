"use client"

import {useEffect, useState, Suspense} from "react"
import {useSearchParams} from "next/navigation"
import {CreationCanvas} from "@/components/canvas/creation-canvas"
import {Asset, Campaign, CanvasElement} from "@/types"
import {mockAssets} from "@/lib/mock-data"

function CreatePageContent() {
  const searchParams = useSearchParams()
  const campaignId = searchParams.get("campaign")

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaignAssets = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (!campaignId) {
          // No campaign selected - use mock data for testing
          setCampaign({
            id: "mock",
            title: "Demo Campaign - No Campaign Selected",
            description:
              "This is demo mode. Select a campaign from the discover page.",
            brandId: "mock",
            status: "active" as const,
            createdBy: "mock",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          setAssets(mockAssets)
          return
        }

        // Fetch campaign details
        const campaignResponse = await fetch(`/api/campaigns/${campaignId}`)
        if (!campaignResponse.ok) {
          const errorText = await campaignResponse.text()
          console.error("Campaign fetch error:", errorText)
          throw new Error(
            `Failed to fetch campaign: ${campaignResponse.status}`
          )
        }
        const responseData = await campaignResponse.json()
        console.log("Campaign response data:", responseData)
        // Handle both old format (campaign.campaign) and new format (direct campaign)
        const campaignData = responseData.campaign || responseData
        setCampaign(campaignData)

        // Check if campaign has assets directly (mock data format)
        if (campaignData.assets && Array.isArray(campaignData.assets)) {
          console.log(
            "Using assets from campaign response:",
            campaignData.assets
          )
          setAssets(campaignData.assets)
        }
        // Otherwise fetch assets for the campaign's IP kit (real data format)
        else if (campaignData.ipKitId) {
          console.log(`Fetching assets for IP kit: ${campaignData.ipKitId}`)
          const assetsResponse = await fetch(
            `/api/assets?ipKitId=${campaignData.ipKitId}`
          )
          if (!assetsResponse.ok) {
            const errorText = await assetsResponse.text()
            console.error("Assets fetch error:", errorText)
            throw new Error(`Failed to fetch assets: ${assetsResponse.status}`)
          }
          const assetsData = await assetsResponse.json()
          console.log("Assets data:", assetsData)
          setAssets(assetsData.assets || [])
        } else {
          console.log(
            "No IP kit ID found in campaign, no assets available"
          )
          setAssets([]) // No assets for campaigns without IP kits
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchCampaignAssets()
  }, [campaignId])

  const handleSave = async (elements: CanvasElement[]) => {
    try {
      // Submission creation is handled by the submission modal in the canvas
      console.log("Manual save requested - this should open submission modal")
      // The actual submission flow is handled by the SubmissionModal component
    } catch (err) {
      console.error("Failed to save submission:", err)
    }
  }

  const handleAutoSave = async (elements: CanvasElement[]) => {
    try {
      // TODO: Implement auto-save to drafts
      console.log("Auto-saving:", elements)
    } catch (err) {
      console.error("Auto-save failed:", err)
    }
  }

  if (error) {
    return (
      <div className='flex h-screen items-center justify-center bg-background'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-destructive mb-2'>Error</h1>
          <p className='text-muted-foreground'>{error}</p>
          <p className='text-sm mt-4'>
            <a href='/discover' className='text-primary hover:underline'>
              Browse campaigns
            </a>
            {" or "}
            <a href='/create' className='text-primary hover:underline'>
              try demo mode
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-screen bg-background'>
      <CreationCanvas
        assets={assets}
        campaignId={campaignId || "mock"}
        campaignTitle={campaign?.title || "Loading..."}
        onSave={handleSave}
        onAutoSave={handleAutoSave}
        isLoading={isLoading}
      />
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className='flex h-screen items-center justify-center bg-background'>
          <div className='text-center'>
            <div className='animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2' />
            <p className='text-sm text-muted-foreground'>Loading canvas...</p>
          </div>
        </div>
      }
    >
      <CreatePageContent />
    </Suspense>
  )
}
