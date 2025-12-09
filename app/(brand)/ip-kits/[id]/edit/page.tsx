import { redirect } from "next/navigation"
import { getCurrentUser, getUserBrandIds } from "@/lib/auth-utils"
import { getIpKitById } from "@/lib/data/campaigns"
import { db } from '@/db'
import { brands } from '@/db/schema'
import { eq } from 'drizzle-orm'
import IpKitEditClient from "./ip-kit-edit-client"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function IpKitEditPage({ params }: PageProps) {
  const { id } = await params
  // Get current user (server-side)
  const user = await getCurrentUser()
  
  if (!user) {
    redirect("/login")
  }

  try {
    const ipKitId = id

    // Fetch IP kit data using shared data layer
    const ipKitData = await getIpKitById(ipKitId)

    if (!ipKitData) {
      redirect("/ip-kits")
    }

    // Clear cache to ensure fresh data (fixes brand creation redirect timing)
    if (user) {
      const { clearUserRoleCache } = await import('@/lib/auth-utils')
      clearUserRoleCache(user.id)
    }
    
    // Verify user has access to this IP kit's brand
    const userBrandIds = await getUserBrandIds(user.id, false) // Force fresh query
    if (!userBrandIds.includes(ipKitData.brandId)) {
      redirect("/ip-kits")
    }

    // Get all user's brands for selection
    const userBrands = await db
      .select({
        id: brands.id,
        name: brands.name,
        description: brands.description
      })
      .from(brands)
      .where(eq(brands.id, userBrandIds[0])) // For now, just get the first brand

    const brandsData = userBrands.map(brand => ({
      ...brand,
      description: brand.description || undefined
    }))

    return (
      <IpKitEditClient 
        ipKit={ipKitData} 
        availableBrands={brandsData}
      />
    )
  } catch (error) {
    console.error("Failed to load IP kit for editing:", error)
    redirect("/ip-kits")
  }
}