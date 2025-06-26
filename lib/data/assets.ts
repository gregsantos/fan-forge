import { db, assets, ipKits, brands, users, userRoles } from "@/db"
import { eq, desc, count, ilike, and, asc, isNull, inArray } from "drizzle-orm"
import { getUserBrandIds } from "@/lib/auth-utils"

/**
 * Shared data functions for assets
 * Following Next.js App Router best practices for server-side data fetching
 */

export async function getBrandAssets(
  searchParams: Record<string, string | undefined> = {}, 
  currentUserId?: string
) {
  try {
    const { 
      search, 
      category, 
      ipKitId,
      tags,
      page = '1', 
      limit = '20',
      sortBy = 'newest' 
    } = searchParams
    
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    // Build where conditions
    const whereConditions = []
    
    // SECURITY: Filter assets by user's brand access
    if (currentUserId) {
      const userBrandIds = await getUserBrandIds(currentUserId)
      if (userBrandIds.length > 0) {
        // Get all users who belong to the same brands as the current user
        const brandUsersResult = await db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(inArray(userRoles.brandId, userBrandIds))
        
        const brandUserIds = brandUsersResult.map(r => r.userId)
        
        if (brandUserIds.length > 0) {
          // Only show assets uploaded by users from the same brand(s)
          whereConditions.push(inArray(assets.uploadedBy, brandUserIds))
        } else {
          // User has no brand access, show no assets
          whereConditions.push(eq(assets.id, 'no-access'))
        }
      } else {
        // User has no brand roles, show no assets
        whereConditions.push(eq(assets.id, 'no-access'))
      }
    }
    
    // Filter by specific IP Kit if provided
    if (ipKitId) {
      whereConditions.push(eq(assets.ipKitId, ipKitId))
    } else if (ipKitId === null || ipKitId === 'null') {
      // Explicitly requesting global assets (for brand assets page only)
      whereConditions.push(isNull(assets.ipKitId))
    }
    
    // Filter by category if provided
    if (category && category !== 'all') {
      whereConditions.push(eq(assets.category, category as any))
    }
    
    // Search functionality
    if (search) {
      whereConditions.push(
        ilike(assets.filename, `%${search}%`)
      )
    }

    // Tag filtering (basic implementation)
    // TODO: Implement proper JSON tag filtering when needed

    // Determine sort order
    const getSortOrder = () => {
      switch (sortBy) {
        case 'oldest':
          return asc(assets.createdAt)
        case 'name':
          return asc(assets.filename)
        case 'size':
          return desc(assets.metadata)
        case 'newest':
        default:
          return desc(assets.createdAt)
      }
    }

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(assets)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)

    // Get assets with IP Kit information
    const assetResults = await db
      .select({
        asset: assets,
        ipKit: {
          id: ipKits.id,
          name: ipKits.name,
        }
      })
      .from(assets)
      .leftJoin(ipKits, eq(assets.ipKitId, ipKits.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(getSortOrder())
      .limit(limitNum)
      .offset(offset)

    return {
      assets: assetResults.map(result => ({
        ...result.asset,
        ipKit: result.ipKit,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalResult.count,
        pages: Math.ceil(totalResult.count / limitNum),
      }
    }
  } catch (error) {
    console.error('Failed to fetch brand assets:', error)
    throw new Error('Failed to fetch brand assets')
  }
}

export async function getAssetStats(currentUserId?: string) {
  try {
    let assetWhereConditions = []
    let ipKitWhereConditions = []
    
    // SECURITY: Filter by user's brand access
    if (currentUserId) {
      const userBrandIds = await getUserBrandIds(currentUserId)
      if (userBrandIds.length > 0) {
        // Get all users who belong to the same brands as the current user
        const brandUsersResult = await db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(inArray(userRoles.brandId, userBrandIds))
        
        const brandUserIds = brandUsersResult.map(r => r.userId)
        
        if (brandUserIds.length > 0) {
          // Only count assets uploaded by users from the same brand(s)
          assetWhereConditions.push(inArray(assets.uploadedBy, brandUserIds))
          // Only count IP kits from the same brand(s)
          ipKitWhereConditions.push(inArray(ipKits.brandId, userBrandIds))
        } else {
          // User has no brand access, show zero counts
          return {
            totalAssets: 0,
            totalIpKits: 0,
            categoryBreakdown: [],
            storageUsed: 0,
            storageLimit: 10 * 1024 * 1024 * 1024
          }
        }
      } else {
        // User has no brand roles, show zero counts
        return {
          totalAssets: 0,
          totalIpKits: 0,
          categoryBreakdown: [],
          storageUsed: 0,
          storageLimit: 10 * 1024 * 1024 * 1024
        }
      }
    }

    // Get total asset count
    const [totalAssets] = await db
      .select({ count: count() })
      .from(assets)
      .where(assetWhereConditions.length > 0 ? and(...assetWhereConditions) : undefined)

    // Get asset counts by category
    const categoryStats = await db
      .select({
        category: assets.category,
        count: count(assets.id)
      })
      .from(assets)
      .where(assetWhereConditions.length > 0 ? and(...assetWhereConditions) : undefined)
      .groupBy(assets.category)

    // Get IP Kit counts
    const [totalIpKits] = await db
      .select({ count: count() })
      .from(ipKits)
      .where(ipKitWhereConditions.length > 0 ? and(...ipKitWhereConditions) : undefined)

    return {
      totalAssets: totalAssets.count,
      totalIpKits: totalIpKits.count,
      categoryBreakdown: categoryStats,
      // TODO: Add storage usage calculation when needed
      storageUsed: 0,
      storageLimit: 10 * 1024 * 1024 * 1024 // 10GB in bytes
    }
  } catch (error) {
    console.error('Failed to fetch asset stats:', error)
    throw new Error('Failed to fetch asset stats')
  }
}

export async function getAssetById(id: string) {
  try {
    const [asset] = await db
      .select({
        asset: assets,
        ipKit: {
          id: ipKits.id,
          name: ipKits.name,
        }
      })
      .from(assets)
      .leftJoin(ipKits, eq(assets.ipKitId, ipKits.id))
      .where(eq(assets.id, id))
      .limit(1)

    if (!asset) {
      return null
    }

    return {
      ...asset.asset,
      ipKit: asset.ipKit,
    }
  } catch (error) {
    console.error(`Failed to fetch asset ${id}:`, error)
    throw new Error('Failed to fetch asset')
  }
}