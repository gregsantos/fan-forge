import { db, campaigns, brands, ipKits, assets, submissions } from "@/db"
import { eq, desc, count, or, ilike, and } from "drizzle-orm"

export async function getDashboardData() {
  try {
    // Fetch recent campaigns
    const recentCampaigns = await db
      .select({
        campaign: campaigns,
        brand: brands,
        assetCount: count(assets.id),
      })
      .from(campaigns)
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .leftJoin(ipKits, eq(campaigns.ipKitId, ipKits.id))
      .leftJoin(assets, eq(ipKits.id, assets.ipKitId))
      .groupBy(campaigns.id, brands.id)
      .orderBy(desc(campaigns.createdAt))
      .limit(10)

    // Get submission counts for campaigns
    const campaignIds = recentCampaigns.map(result => result.campaign.id)
    const submissionCounts = campaignIds.length > 0 ? await db
      .select({
        campaignId: submissions.campaignId,
        submissionCount: count(submissions.id),
      })
      .from(submissions)
      .where(or(...campaignIds.map(id => eq(submissions.campaignId, id))))
      .groupBy(submissions.campaignId) : []

    // Create submission count map
    const submissionCountMap = new Map(
      submissionCounts.map(sc => [sc.campaignId, sc.submissionCount])
    )

    // Fetch recent submissions
    const recentSubmissions = await db
      .select({
        submission: submissions,
        campaign: campaigns,
      })
      .from(submissions)
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .orderBy(desc(submissions.createdAt))
      .limit(10)

    return {
      campaigns: recentCampaigns.map(result => ({
        id: result.campaign.id,
        title: result.campaign.title,
        status: result.campaign.status,
        deadline: result.campaign.endDate,
        submission_count: submissionCountMap.get(result.campaign.id) || 0,
      })),
      submissions: recentSubmissions.map(result => ({
        id: result.submission.id,
        title: result.submission.title,
        status: result.submission.status,
        createdAt: result.submission.createdAt,
        campaign: result.campaign ? {
          title: result.campaign.title
        } : null,
      }))
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return {
      campaigns: [],
      submissions: []
    }
  }
}

export async function getCampaigns(searchParams: Record<string, string | undefined>) {
  try {
    const { search, status, page = '1' } = searchParams
    const limit = 12
    const offset = (parseInt(page) - 1) * limit

    // Build where conditions (simplified for now)
    const campaignResults = await db
      .select({
        campaign: campaigns,
        brand: brands,
        assetCount: count(assets.id),
      })
      .from(campaigns)
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .leftJoin(ipKits, eq(campaigns.ipKitId, ipKits.id))
      .leftJoin(assets, eq(ipKits.id, assets.ipKitId))
      .groupBy(campaigns.id, brands.id)
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset)

    // Get submission counts
    const campaignIds = campaignResults.map(result => result.campaign.id)
    const submissionCounts = campaignIds.length > 0 ? await db
      .select({
        campaignId: submissions.campaignId,
        submissionCount: count(submissions.id),
      })
      .from(submissions)
      .where(or(...campaignIds.map(id => eq(submissions.campaignId, id))))
      .groupBy(submissions.campaignId) : []

    const submissionCountMap = new Map(
      submissionCounts.map(sc => [sc.campaignId, sc.submissionCount])
    )

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(campaigns)

    return {
      campaigns: campaignResults.map(result => ({
        id: result.campaign.id,
        title: result.campaign.title,
        description: result.campaign.description,
        brand_name: result.brand?.name || "Unknown Brand",
        status: result.campaign.status,
        deadline: result.campaign.endDate,
        asset_count: result.assetCount || 0,
        submission_count: submissionCountMap.get(result.campaign.id) || 0,
        created_at: result.campaign.createdAt,
        updated_at: result.campaign.updatedAt,
        featured: result.campaign.featuredUntil ? new Date(result.campaign.featuredUntil) > new Date() : false,
      })),
      pagination: {
        page: parseInt(page),
        limit,
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / limit),
      }
    }
  } catch (error) {
    console.error('Failed to fetch campaigns:', error)
    throw new Error('Failed to fetch campaigns')
  }
}

export async function getSubmissions(searchParams: Record<string, string | undefined>) {
  try {
    const { search, status, page = '1' } = searchParams
    const limit = 12
    const offset = (parseInt(page) - 1) * limit

    const submissionResults = await db
      .select({
        submission: submissions,
        campaign: campaigns,
      })
      .from(submissions)
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(submissions)

    return {
      submissions: submissionResults.map(result => ({
        id: result.submission.id,
        title: result.submission.title,
        description: result.submission.description,
        status: result.submission.status,
        artworkUrl: result.submission.artworkUrl,
        createdAt: result.submission.createdAt,
        feedback: result.submission.feedback,
        creator: {
          displayName: 'Unknown Creator' // TODO: Join with users table
        },
        campaign: result.campaign ? {
          title: result.campaign.title
        } : null,
      })),
      pagination: {
        page: parseInt(page),
        limit,
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / limit),
      }
    }
  } catch (error) {
    console.error('Failed to fetch submissions:', error)
    throw new Error('Failed to fetch submissions')
  }
}

export async function getIpKits(searchParams: Record<string, string | undefined>) {
  try {
    const { search, published, page = '1' } = searchParams
    const limit = 12
    const offset = (parseInt(page) - 1) * limit

    // Build where conditions
    const whereConditions = []
    
    if (search) {
      whereConditions.push(ilike(ipKits.name, `%${search}%`))
    }
    
    if (published && published !== 'all') {
      whereConditions.push(eq(ipKits.isPublished, published === 'true'))
    }

    const ipKitResults = await db
      .select({
        ipKit: ipKits,
        brand: brands,
        assetCount: count(assets.id),
      })
      .from(ipKits)
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .leftJoin(assets, eq(ipKits.id, assets.ipKitId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(ipKits.id, brands.id)
      .orderBy(desc(ipKits.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(ipKits)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)

    return {
      ipKits: ipKitResults.map(result => ({
        id: result.ipKit.id,
        name: result.ipKit.name,
        description: result.ipKit.description,
        published: result.ipKit.isPublished,
        brand_name: result.brand?.name || "Unknown Brand",
        asset_count: result.assetCount || 0,
        created_at: result.ipKit.createdAt,
        updated_at: result.ipKit.updatedAt,
      })),
      pagination: {
        page: parseInt(page),
        limit,
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / limit),
      }
    }
  } catch (error) {
    console.error('Failed to fetch IP kits:', error)
    throw new Error('Failed to fetch IP kits')
  }
}

export async function getCreatorSubmissions(creatorId: string, searchParams: Record<string, string | undefined> = {}) {
  try {
    const { search, status, page = '1' } = searchParams
    const limit = 12
    const offset = (parseInt(page) - 1) * limit

    // Build where conditions
    const whereConditions = [eq(submissions.creatorId, creatorId)]
    
    if (search) {
      whereConditions.push(ilike(submissions.title, `%${search}%`))
    }
    
    if (status && status !== 'all') {
      whereConditions.push(eq(submissions.status, status as any))
    }

    const submissionResults = await db
      .select({
        submission: submissions,
        campaign: campaigns,
      })
      .from(submissions)
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .where(and(...whereConditions))
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(submissions)
      .where(and(...whereConditions))

    return {
      submissions: submissionResults.map(result => ({
        id: result.submission.id,
        title: result.submission.title,
        description: result.submission.description,
        status: result.submission.status,
        artworkUrl: result.submission.artworkUrl,
        createdAt: result.submission.createdAt,
        updatedAt: result.submission.updatedAt,
        feedback: result.submission.feedback,
        campaignId: result.submission.campaignId,
        campaign: result.campaign ? {
          title: result.campaign.title
        } : null,
      })),
      pagination: {
        page: parseInt(page),
        limit,
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / limit),
      }
    }
  } catch (error) {
    console.error('Failed to fetch creator submissions:', error)
    throw new Error('Failed to fetch creator submissions')
  }
}

export async function getCampaignById(id: string) {
  try {
    // Get campaign with relations
    const campaignWithDetails = await db
      .select({
        campaign: campaigns,
        brand: brands,
        ipKit: ipKits,
      })
      .from(campaigns)
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .leftJoin(ipKits, eq(campaigns.ipKitId, ipKits.id))
      .where(eq(campaigns.id, id))
      .limit(1)

    if (campaignWithDetails.length === 0) {
      return null
    }

    const result = campaignWithDetails[0]

    // Get assets for the campaign's IP kit
    const campaignAssets = result.ipKit ? await db
      .select()
      .from(assets)
      .where(eq(assets.ipKitId, result.ipKit.id)) : []

    return {
      id: result.campaign.id,
      title: result.campaign.title,
      description: result.campaign.description,
      guidelines: result.campaign.guidelines,
      brand_name: result.brand?.name,
      status: result.campaign.status,
      deadline: result.campaign.endDate,
      created_at: result.campaign.createdAt,
      featured: result.campaign.featuredUntil ? new Date(result.campaign.featuredUntil) > new Date() : false,
      brand: result.brand ? {
        name: result.brand.name
      } : null,
      createdAt: result.campaign.createdAt,
      updatedAt: result.campaign.updatedAt,
      assets: campaignAssets.map(asset => ({
        id: asset.id,
        filename: asset.filename,
        url: asset.url,
        category: asset.category,
        metadata: asset.metadata,
      }))
    }
  } catch (error) {
    console.error('Failed to fetch campaign:', error)
    throw new Error('Failed to fetch campaign')
  }
}