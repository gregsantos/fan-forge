import { db, campaigns, brands, ipKits, assets, submissions, users, reviews, assetIpKits, submissionAssets, userRoles, roles } from "@/db"
import { eq, desc, count, or, ilike, and, asc, inArray, gte, lte, isNotNull } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"

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

    // Fetch recent submissions (pending only for dashboard)
    const recentSubmissions = await db
      .select({
        submission: submissions,
        campaign: campaigns,
      })
      .from(submissions)
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .where(eq(submissions.status, 'pending'))
      .orderBy(desc(submissions.createdAt))
      .limit(10)

    // Fetch recent IP kits
    const recentIpKits = await db
      .select({
        ipKit: ipKits,
        brand: brands,
        assetCount: count(assets.id),
      })
      .from(ipKits)
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .leftJoin(assets, eq(ipKits.id, assets.ipKitId))
      .groupBy(ipKits.id, brands.id)
      .orderBy(desc(ipKits.createdAt))
      .limit(10)

    // Fetch recent assets
    const recentAssets = await db
      .select({
        asset: assets,
        ipKit: ipKits,
      })
      .from(assets)
      .leftJoin(ipKits, eq(assets.ipKitId, ipKits.id))
      .orderBy(desc(assets.createdAt))
      .limit(10)

    // Get IP kit statistics
    const [totalIpKits] = await db
      .select({ count: count() })
      .from(ipKits)
    
    const [publishedIpKits] = await db
      .select({ count: count() })
      .from(ipKits)
      .where(eq(ipKits.isPublished, true))

    // Get asset statistics
    const [assetStats] = await db
      .select({
        total: count(),
      })
      .from(assets)

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
      })),
      ipKits: recentIpKits.map(result => ({
        id: result.ipKit.id,
        name: result.ipKit.name,
        isPublished: result.ipKit.isPublished,
        assetCount: result.assetCount || 0,
        brandName: result.brand?.name || 'Unknown Brand',
        createdAt: result.ipKit.createdAt,
        updatedAt: result.ipKit.updatedAt,
      })),
      assets: recentAssets.map(result => ({
        id: result.asset.id,
        filename: result.asset.filename,
        originalFilename: result.asset.originalFilename,
        url: result.asset.url,
        thumbnailUrl: result.asset.thumbnailUrl,
        category: result.asset.category,
        ipKitId: result.asset.ipKitId,
        ipKitName: result.ipKit?.name || 'Global Asset',
        createdAt: result.asset.createdAt,
      })),
      stats: {
        ipKits: {
          total: totalIpKits?.count || 0,
          published: publishedIpKits?.count || 0,
          draft: (totalIpKits?.count || 0) - (publishedIpKits?.count || 0),
        },
        assets: {
          total: assetStats?.total || 0,
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    return {
      campaigns: [],
      submissions: [],
      ipKits: [],
      assets: [],
      stats: {
        ipKits: { total: 0, published: 0, draft: 0 },
        assets: { total: 0 }
      }
    }
  }
}

export async function getCampaigns(searchParams: Record<string, string | undefined>) {
  try {
    const { search, status, page = '1', featured, limit: limitParam } = searchParams
    const limit = limitParam ? parseInt(limitParam) : 12
    const offset = (parseInt(page) - 1) * limit

    // Build where conditions
    const whereConditions = []
    
    if (featured === 'true') {
      whereConditions.push(and(
        isNotNull(campaigns.featuredUntil),
        gte(campaigns.featuredUntil, new Date())
      ))
    }
    
    if (search) {
      whereConditions.push(or(
        ilike(campaigns.title, `%${search}%`),
        ilike(campaigns.description, `%${search}%`),
        ilike(brands.name, `%${search}%`)
      )!)
    }
    
    if (status && status !== 'all') {
      whereConditions.push(eq(campaigns.status, status as any))
    }

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
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
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
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)

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
        thumbnail_url: result.campaign.thumbnailUrl,
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

export async function getIpKitById(ipKitId: string) {
  try {
    // Get IP Kit with brand info
    const result = await db
      .select({
        id: ipKits.id,
        name: ipKits.name,
        description: ipKits.description,
        guidelines: ipKits.guidelines,
        brandId: ipKits.brandId,
        isPublished: ipKits.isPublished,
        version: ipKits.version,
        createdAt: ipKits.createdAt,
        updatedAt: ipKits.updatedAt,
        brandName: brands.name,
        brandDescription: brands.description
      })
      .from(ipKits)
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .where(eq(ipKits.id, ipKitId))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    const ipKit = result[0]

    // Get assets for this IP Kit using junction table
    const ipKitAssets = await db
      .select({
        id: assets.id,
        filename: assets.filename,
        originalFilename: assets.originalFilename,
        url: assets.url,
        thumbnailUrl: assets.thumbnailUrl,
        category: assets.category,
        tags: assets.tags,
        metadata: assets.metadata,
        ipId: assets.ipId,
        ipKitId: assetIpKits.ipKitId, // Include ipKitId from junction table
        createdAt: assets.createdAt
      })
      .from(assets)
      .innerJoin(assetIpKits, eq(assets.id, assetIpKits.assetId))
      .where(eq(assetIpKits.ipKitId, ipKitId))
      .orderBy(assets.createdAt)

    // Transform assets to handle null values
    const transformedAssets = ipKitAssets.map(asset => ({
      ...asset,
      thumbnailUrl: asset.thumbnailUrl || undefined,
      tags: asset.tags || [],
      ipId: asset.ipId || undefined
    }))

    return {
      ...ipKit,
      description: ipKit.description || undefined,
      guidelines: ipKit.guidelines || undefined,
      brandDescription: ipKit.brandDescription || undefined,
      brandName: ipKit.brandName || "Unknown Brand",
      isPublished: ipKit.isPublished ?? false,
      version: ipKit.version ?? 1,
      assets: transformedAssets,
      assetCount: transformedAssets.length
    }
  } catch (error) {
    console.error('Failed to fetch IP kit:', error)
    throw new Error('Failed to fetch IP kit')
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

    // Get assets for the campaign's IP kit (only if campaign has an IP kit)
    const campaignAssets = result.ipKit ? await db
      .select()
      .from(assets)
      .where(eq(assets.ipKitId, result.ipKit.id)) : []

    return {
      id: result.campaign.id,
      title: result.campaign.title,
      description: result.campaign.description,
      guidelines: result.campaign.guidelines,
      ipKitId: result.campaign.ipKitId,
      imageUrl: result.campaign.imageUrl,
      thumbnailUrl: result.campaign.thumbnailUrl,
      brand_name: result.brand?.name,
      status: result.campaign.status,
      startDate: result.campaign.startDate,
      endDate: result.campaign.endDate,
      deadline: result.campaign.endDate,
      maxSubmissions: result.campaign.maxSubmissions,
      rewardAmount: result.campaign.rewardAmount,
      rewardCurrency: result.campaign.rewardCurrency,
      briefDocument: result.campaign.briefDocument,
      created_at: result.campaign.createdAt,
      featured: result.campaign.featuredUntil ? new Date(result.campaign.featuredUntil) > new Date() : false,
      brand: result.brand ? {
        name: result.brand.name
      } : null,
      ipKit: result.ipKit ? {
        id: result.ipKit.id,
        name: result.ipKit.name,
        description: result.ipKit.description,
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

export async function getCampaignSubmissions(campaignId: string, searchParams: Record<string, string | undefined> = {}) {
  try {
    const { search, status = 'approved', page = '1', sortBy = 'newest' } = searchParams
    const limit = 12
    const offset = (parseInt(page) - 1) * limit

    // Build where conditions
    const whereConditions = [eq(submissions.campaignId, campaignId)]
    
    if (status === 'approved') {
      whereConditions.push(eq(submissions.status, 'approved'))
      whereConditions.push(eq(submissions.isPublic, true))
    } else if (status && status !== 'all') {
      whereConditions.push(eq(submissions.status, status as any))
    }

    // Add search functionality
    if (search) {
      whereConditions.push(
        or(
          ilike(submissions.title, `%${search}%`),
          ilike(users.displayName, `%${search}%`)
        )!
      )
    }

    // Determine sort order
    const getSortOrder = () => {
      switch (sortBy) {
        case 'oldest':
          return asc(submissions.createdAt)
        case 'popular':
          return [desc(submissions.likeCount), desc(submissions.viewCount)]
        case 'title':
          return asc(submissions.title)
        case 'newest':
        default:
          return desc(submissions.createdAt)
      }
    }

    const submissionResults = await db
      .select({
        submission: submissions,
        creator: {
          id: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(submissions)
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .where(and(...whereConditions))
      .orderBy(...(Array.isArray(getSortOrder()) ? getSortOrder() as any : [getSortOrder()]))
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(submissions)
      .leftJoin(users, eq(submissions.creatorId, users.id))
      .where(and(...whereConditions))

    return {
      submissions: submissionResults.map(result => ({
        id: result.submission.id,
        title: result.submission.title,
        description: result.submission.description,
        status: result.submission.status,
        artworkUrl: result.submission.artworkUrl,
        createdAt: result.submission.createdAt,
        likeCount: result.submission.likeCount || 0,
        viewCount: result.submission.viewCount || 0,
        creator: result.creator ? {
          id: result.creator.id,
          displayName: result.creator.displayName,
          avatarUrl: result.creator.avatarUrl,
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
    console.error('Failed to fetch campaign submissions:', error)
    throw new Error('Failed to fetch campaign submissions')
  }
}

// Review-specific data functions for brand admin submission queue
export async function getSubmissionQueue(searchParams: Record<string, string | undefined> = {}) {
  try {
    const { 
      search, 
      status = 'pending', 
      campaignId, 
      creatorId,
      dateFrom,
      dateTo,
      page = '1', 
      sortBy = 'newest' 
    } = searchParams
    const limit = 20 // Higher limit for review queue
    const offset = (parseInt(page) - 1) * limit

    // Create aliases for users table to avoid conflicts
    const creators = alias(users, 'creators')
    const reviewers = alias(users, 'reviewers')

    // Build where conditions
    const whereConditions = []
    
    if (status && status !== 'all') {
      whereConditions.push(eq(submissions.status, status as any))
    }
    
    if (campaignId) {
      whereConditions.push(eq(submissions.campaignId, campaignId))
    }
    
    if (creatorId) {
      whereConditions.push(eq(submissions.creatorId, creatorId))
    }

    // Add search functionality across submission title, description, and creator name
    if (search) {
      whereConditions.push(
        or(
          ilike(submissions.title, `%${search}%`),
          ilike(submissions.description, `%${search}%`),
          ilike(creators.displayName, `%${search}%`),
          ilike(creators.email, `%${search}%`)
        )!
      )
    }

    // Date range filtering
    if (dateFrom) {
      whereConditions.push(gte(submissions.createdAt, new Date(dateFrom)))
    }
    if (dateTo) {
      whereConditions.push(lte(submissions.createdAt, new Date(dateTo)))
    }

    // Determine sort order
    const getSortOrder = () => {
      switch (sortBy) {
        case 'oldest':
          return asc(submissions.createdAt)
        case 'title':
          return asc(submissions.title)
        case 'creator':
          return asc(creators.displayName)
        case 'campaign':
          return asc(campaigns.title)
        case 'newest':
        default:
          return desc(submissions.createdAt)
      }
    }

    const submissionResults = await db
      .select({
        submission: submissions,
        creator: {
          id: creators.id,
          displayName: creators.displayName,
          email: creators.email,
          avatarUrl: creators.avatarUrl,
        },
        campaign: {
          id: campaigns.id,
          title: campaigns.title,
          brandId: campaigns.brandId,
        },
        brand: {
          id: brands.id,
          name: brands.name,
        },
        reviewedBy: {
          id: reviewers.id,
          displayName: reviewers.displayName,
        },
      })
      .from(submissions)
      .leftJoin(creators, eq(submissions.creatorId, creators.id))
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .leftJoin(reviewers, eq(submissions.reviewedBy, reviewers.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(getSortOrder())
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(submissions)
      .leftJoin(creators, eq(submissions.creatorId, creators.id))
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)

    return {
      submissions: submissionResults.map(result => ({
        id: result.submission.id,
        title: result.submission.title,
        description: result.submission.description,
        status: result.submission.status,
        artworkUrl: result.submission.artworkUrl,
        thumbnailUrl: result.submission.thumbnailUrl,
        feedback: result.submission.feedback,
        rating: result.submission.rating,
        createdAt: result.submission.createdAt,
        reviewedAt: result.submission.reviewedAt,
        viewCount: result.submission.viewCount || 0,
        likeCount: result.submission.likeCount || 0,
        creator: result.creator,
        campaign: result.campaign,
        brand: result.brand,
        reviewedBy: result.reviewedBy,
      })),
      pagination: {
        page: parseInt(page),
        limit,
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / limit),
      }
    }
  } catch (error) {
    console.error('Failed to fetch submission queue:', error)
    throw new Error('Failed to fetch submission queue')
  }
}

export async function getSubmissionById(submissionId: string) {
  try {
    // Create aliases for users table to avoid conflicts
    const creators = alias(users, 'creators')
    const reviewers = alias(users, 'reviewers')

    const submissionResults = await db
      .select({
        submission: submissions,
        creator: {
          id: creators.id,
          displayName: creators.displayName,
          email: creators.email,
          avatarUrl: creators.avatarUrl,
          bio: creators.bio,
        },
        campaign: {
          id: campaigns.id,
          title: campaigns.title,
          description: campaigns.description,
          guidelines: campaigns.guidelines,
          brandId: campaigns.brandId,
        },
        brand: {
          id: brands.id,
          name: brands.name,
          logoUrl: brands.logoUrl,
        },
        ipKit: {
          id: ipKits.id,
          name: ipKits.name,
        },
        reviewedBy: {
          id: reviewers.id,
          displayName: reviewers.displayName,
          email: reviewers.email,
        },
      })
      .from(submissions)
      .leftJoin(creators, eq(submissions.creatorId, creators.id))
      .leftJoin(campaigns, eq(submissions.campaignId, campaigns.id))
      .leftJoin(brands, eq(campaigns.brandId, brands.id))
      .leftJoin(ipKits, eq(submissions.ipId, ipKits.id))
      .leftJoin(reviewers, eq(submissions.reviewedBy, reviewers.id))
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (submissionResults.length === 0) {
      return null
    }

    const result = submissionResults[0]

    // Get review history
    const reviewHistory = await getSubmissionReviews(submissionId)

    return {
      id: result.submission.id,
      title: result.submission.title,
      description: result.submission.description,
      status: result.submission.status,
      artworkUrl: result.submission.artworkUrl,
      thumbnailUrl: result.submission.thumbnailUrl,
      canvasData: result.submission.canvasData,
      tags: result.submission.tags,
      feedback: result.submission.feedback,
      rating: result.submission.rating,
      isPublic: result.submission.isPublic,
      viewCount: result.submission.viewCount || 0,
      likeCount: result.submission.likeCount || 0,
      createdAt: result.submission.createdAt,
      updatedAt: result.submission.updatedAt,
      reviewedAt: result.submission.reviewedAt,
      creator: result.creator,
      campaign: result.campaign,
      brand: result.brand,
      ipKit: result.ipKit,
      reviewedBy: result.reviewedBy,
      reviewHistory,
    }
  } catch (error) {
    console.error('Failed to fetch submission details:', error)
    throw new Error('Failed to fetch submission details')
  }
}

export async function getSubmissionReviews(submissionId: string) {
  try {
    const reviewResults = await db
      .select({
        review: reviews,
        reviewer: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.reviewerId, users.id))
      .where(eq(reviews.submissionId, submissionId))
      .orderBy(desc(reviews.createdAt))

    return reviewResults.map(result => ({
      id: result.review.id,
      status: result.review.status,
      feedback: result.review.feedback,
      rating: result.review.rating,
      internalNotes: result.review.internalNotes,
      createdAt: result.review.createdAt,
      reviewer: result.reviewer,
    }))
  } catch (error) {
    console.error('Failed to fetch submission reviews:', error)
    return []
  }
}

// Get campaigns for filtering in review queue
export async function getCampaignsForFilter() {
  try {
    const campaignResults = await db
      .select({
        id: campaigns.id,
        title: campaigns.title,
        status: campaigns.status,
        brandId: campaigns.brandId,
      })
      .from(campaigns)
      .orderBy(desc(campaigns.createdAt))
      .limit(100) // Reasonable limit for dropdown

    return campaignResults
  } catch (error) {
    console.error('Failed to fetch campaigns for filter:', error)
    return []
  }
}

// Get comprehensive analytics data for brand analytics page
export async function getAnalyticsData() {
  try {
    // Campaign analytics
    const campaignStats = await db
      .select({
        status: campaigns.status,
        count: count(),
      })
      .from(campaigns)
      .groupBy(campaigns.status)

    // Get campaigns with submission counts for performance analysis
    const campaignPerformance = await db
      .select({
        campaign: campaigns,
        submissionCount: count(submissions.id),
      })
      .from(campaigns)
      .leftJoin(submissions, eq(campaigns.id, submissions.campaignId))
      .groupBy(campaigns.id)
      .orderBy(desc(count(submissions.id)))
      .limit(10)

    // Asset usage analytics - most used assets in submissions
    const assetUsage = await db
      .select({
        asset: assets,
        ipKit: ipKits,
        usageCount: count(submissionAssets.submissionId),
      })
      .from(assets)
      .leftJoin(ipKits, eq(assets.ipKitId, ipKits.id))
      .leftJoin(submissionAssets, eq(assets.id, submissionAssets.assetId))
      .groupBy(assets.id, ipKits.id)
      .orderBy(desc(count(submissionAssets.submissionId)))
      .limit(10)

    // Submission analytics by status and time
    const submissionStats = await db
      .select({
        status: submissions.status,
        count: count(),
      })
      .from(submissions)
      .groupBy(submissions.status)

    // Creator engagement - most active creators
    const creatorEngagement = await db
      .select({
        creator: users,
        submissionCount: count(submissions.id),
      })
      .from(users)
      .leftJoin(submissions, eq(users.id, submissions.creatorId))
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(roles.name, 'creator'))
      .groupBy(users.id)
      .orderBy(desc(count(submissions.id)))
      .limit(10)

    // Time-based analytics - last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentActivity = await db
      .select({
        date: submissions.createdAt,
        count: count(),
      })
      .from(submissions)
      .where(gte(submissions.createdAt, thirtyDaysAgo))
      .groupBy(submissions.createdAt)
      .orderBy(submissions.createdAt)

    // Asset category breakdown
    const assetCategories = await db
      .select({
        category: assets.category,
        count: count(),
      })
      .from(assets)
      .groupBy(assets.category)

    // Overall totals
    const [totalCampaigns] = await db.select({ count: count() }).from(campaigns)
    const [totalSubmissions] = await db.select({ count: count() }).from(submissions)
    const [totalAssets] = await db.select({ count: count() }).from(assets)
    const [totalCreators] = await db
      .select({ count: count() })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(roles.name, 'creator'))

    return {
      overview: {
        totalCampaigns: totalCampaigns.count,
        totalSubmissions: totalSubmissions.count,
        totalAssets: totalAssets.count,
        totalCreators: totalCreators.count,
      },
      campaigns: {
        byStatus: campaignStats,
        topPerforming: campaignPerformance,
      },
      assets: {
        mostUsed: assetUsage,
        byCategory: assetCategories,
      },
      submissions: {
        byStatus: submissionStats,
        recentActivity,
      },
      creators: {
        topContributors: creatorEngagement,
      }
    }
  } catch (error) {
    console.error('Failed to fetch analytics data:', error)
    return {
      overview: {
        totalCampaigns: 0,
        totalSubmissions: 0,
        totalAssets: 0,
        totalCreators: 0,
      },
      campaigns: {
        byStatus: [],
        topPerforming: [],
      },
      assets: {
        mostUsed: [],
        byCategory: [],
      },
      submissions: {
        byStatus: [],
        recentActivity: [],
      },
      creators: {
        topContributors: [],
      }
    }
  }
}

// Get review statistics for dashboard
export async function getReviewStats() {
  try {
    // Get submission counts by status
    const statusCounts = await db
      .select({
        status: submissions.status,
        count: count(),
      })
      .from(submissions)
      .groupBy(submissions.status)

    // Get recent review activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentReviews = await db
      .select({
        count: count(),
      })
      .from(submissions)
      .where(and(
        gte(submissions.reviewedAt, thirtyDaysAgo),
        or(
          eq(submissions.status, 'approved'),
          eq(submissions.status, 'rejected')
        )
      ))

    const statusMap = new Map(statusCounts.map(s => [s.status, s.count]))

    return {
      pending: statusMap.get('pending') || 0,
      approved: statusMap.get('approved') || 0,
      rejected: statusMap.get('rejected') || 0,
      withdrawn: statusMap.get('withdrawn') || 0,
      recentReviews: recentReviews[0]?.count || 0,
    }
  } catch (error) {
    console.error('Failed to fetch review stats:', error)
    return {
      pending: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
      recentReviews: 0,
    }
  }
}