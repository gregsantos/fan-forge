import {createClient} from "@/utils/supabase/server"
import {cookies} from "next/headers"
import {db} from "@/db"
import {users, userRoles, roles, brands, ipKits, campaigns} from "@/db/schema"
import {eq, and, or} from "drizzle-orm"

export interface UserPermissions {
  canCreateIpKits: boolean
  canEditIpKit: (ipKitId: string) => Promise<boolean>
  canDeleteIpKit: (ipKitId: string) => Promise<boolean>
  canUploadAssets: (ipKitId: string) => Promise<boolean>
  canManageAssets: (ipKitId: string) => Promise<boolean>
  canCreateCampaigns: boolean
  canEditCampaign: (campaignId: string) => Promise<boolean>
  canDeleteCampaign: (campaignId: string) => Promise<boolean>
  canReviewSubmissions: boolean
  isPlatformAdmin: boolean
  userBrands: string[] // Brand IDs the user has access to
}

export class PermissionService {
  /**
   * Get comprehensive user permissions
   */
  async getUserPermissions(userId?: string): Promise<UserPermissions | null> {
    try {
      // Get current user if not provided
      if (!userId) {
        const supabase = createClient(cookies())
        const {
          data: {user},
          error,
        } = await supabase.auth.getUser()
        if (error || !user) return null
        userId = user.id
      }

      // Get user with roles and brands
      const userWithRoles = await db
        .select({
          user: users,
          userRole: userRoles,
          role: roles,
          brand: brands,
        })
        .from(users)
        .leftJoin(userRoles, eq(users.id, userRoles.userId))
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .leftJoin(brands, eq(userRoles.brandId, brands.id))
        .where(eq(users.id, userId))

      if (userWithRoles.length === 0) return null

      // Extract user brands
      const userBrands = userWithRoles
        .filter(item => item.brand)
        .map(item => item.brand!.id)

      // Check if user is platform admin
      const isPlatformAdmin = userWithRoles.some(
        item => item.role?.name === "platform_admin"
      )

      // Check if user is brand admin or reviewer
      const isBrandAdmin = userWithRoles.some(
        item => item.role?.name === "brand_admin"
      )

      const isBrandReviewer = userWithRoles.some(
        item => item.role?.name === "brand_reviewer"
      )

      return {
        canCreateIpKits: isPlatformAdmin || isBrandAdmin,
        canEditIpKit: async (ipKitId: string) =>
          this.canEditIpKit(userId!, ipKitId),
        canDeleteIpKit: async (ipKitId: string) =>
          this.canDeleteIpKit(userId!, ipKitId),
        canUploadAssets: async (ipKitId: string) =>
          this.canUploadAssets(userId!, ipKitId),
        canManageAssets: async (ipKitId: string) =>
          this.canManageAssets(userId!, ipKitId),
        canCreateCampaigns: isPlatformAdmin || isBrandAdmin,
        canEditCampaign: async (campaignId: string) =>
          this.canEditCampaign(userId!, campaignId),
        canDeleteCampaign: async (campaignId: string) =>
          this.canDeleteCampaign(userId!, campaignId),
        canReviewSubmissions:
          isPlatformAdmin || isBrandAdmin || isBrandReviewer,
        isPlatformAdmin,
        userBrands,
      }
    } catch (error) {
      console.error("Error getting user permissions:", error)
      return null
    }
  }

  /**
   * Check if user can edit a specific IP Kit
   */
  async canEditIpKit(userId: string, ipKitId: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId)
      if (!permissions) return false

      // Platform admin can edit any IP Kit
      if (permissions.isPlatformAdmin) return true

      // Get IP Kit brand
      const [ipKit] = await db
        .select({brandId: ipKits.brandId})
        .from(ipKits)
        .where(eq(ipKits.id, ipKitId))
        .limit(1)

      if (!ipKit) return false

      // Check if user has access to the brand
      return permissions.userBrands.includes(ipKit.brandId)
    } catch (error) {
      console.error("Error checking IP Kit edit permission:", error)
      return false
    }
  }

  /**
   * Check if user can delete a specific IP Kit
   */
  async canDeleteIpKit(userId: string, ipKitId: string): Promise<boolean> {
    try {
      // Only brand owners and platform admins can delete IP Kits
      const permissions = await this.getUserPermissions(userId)
      if (!permissions) return false

      if (permissions.isPlatformAdmin) return true

      // Get IP Kit with brand owner info
      const [ipKitBrand] = await db
        .select({
          brandId: ipKits.brandId,
          brandOwnerId: brands.ownerId,
        })
        .from(ipKits)
        .leftJoin(brands, eq(ipKits.brandId, brands.id))
        .where(eq(ipKits.id, ipKitId))
        .limit(1)

      if (!ipKitBrand) return false

      // Check if user is brand owner
      return ipKitBrand.brandOwnerId === userId
    } catch (error) {
      console.error("Error checking IP Kit delete permission:", error)
      return false
    }
  }

  /**
   * Check if user can upload assets to an IP Kit
   */
  async canUploadAssets(userId: string, ipKitId: string): Promise<boolean> {
    // Same as edit permissions for now
    return this.canEditIpKit(userId, ipKitId)
  }

  /**
   * Check if user can manage assets in an IP Kit
   */
  async canManageAssets(userId: string, ipKitId: string): Promise<boolean> {
    // Same as edit permissions for now
    return this.canEditIpKit(userId, ipKitId)
  }

  /**
   * Check if user can edit a specific campaign
   */
  async canEditCampaign(userId: string, campaignId: string): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId)
      if (!permissions) return false

      if (permissions.isPlatformAdmin) return true

      // Get campaign brand
      const [campaign] = await db
        .select({brandId: campaigns.brandId})
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1)

      if (!campaign) return false

      return permissions.userBrands.includes(campaign.brandId)
    } catch (error) {
      console.error("Error checking campaign edit permission:", error)
      return false
    }
  }

  /**
   * Check if user can delete a specific campaign
   */
  async canDeleteCampaign(
    userId: string,
    campaignId: string
  ): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId)
      if (!permissions) return false

      if (permissions.isPlatformAdmin) return true

      // Get campaign with brand owner info
      const [campaignBrand] = await db
        .select({
          brandId: campaigns.brandId,
          brandOwnerId: brands.ownerId,
        })
        .from(campaigns)
        .leftJoin(brands, eq(campaigns.brandId, brands.id))
        .where(eq(campaigns.id, campaignId))
        .limit(1)

      if (!campaignBrand) return false

      // Check if user is brand owner
      return campaignBrand.brandOwnerId === userId
    } catch (error) {
      console.error("Error checking campaign delete permission:", error)
      return false
    }
  }

  /**
   * Check if IP Kit can be safely deleted (not used in active campaigns)
   */
  async canSafelyDeleteIpKit(ipKitId: string): Promise<{
    canDelete: boolean
    activeCampaigns: Array<{id: string; title: string; status: string}>
    warnings: string[]
  }> {
    try {
      // Find campaigns using this IP Kit
      const campaignsUsingIpKit = await db
        .select({
          id: campaigns.id,
          title: campaigns.title,
          status: campaigns.status,
        })
        .from(campaigns)
        .where(eq(campaigns.ipKitId, ipKitId))

      const activeCampaigns = campaignsUsingIpKit.filter(
        campaign => campaign.status === "active" || campaign.status === "draft"
      )

      const warnings = []

      if (activeCampaigns.length > 0) {
        warnings.push(
          `This IP Kit is used by ${activeCampaigns.length} active/draft campaign(s). Deleting it will affect these campaigns.`
        )
      }

      if (campaignsUsingIpKit.length > activeCampaigns.length) {
        const completedCount =
          campaignsUsingIpKit.length - activeCampaigns.length
        warnings.push(
          `This IP Kit was used by ${completedCount} completed campaign(s). Historical data will be preserved.`
        )
      }

      return {
        canDelete: true, // Allow deletion but show warnings
        activeCampaigns,
        warnings,
      }
    } catch (error) {
      console.error("Error checking IP Kit safe delete:", error)
      return {
        canDelete: false,
        activeCampaigns: [],
        warnings: ["Unable to verify campaign usage. Please try again."],
      }
    }
  }

  /**
   * Get user's accessible brands
   */
  async getUserBrands(
    userId?: string
  ): Promise<Array<{id: string; name: string; role: string}>> {
    try {
      if (!userId) {
        const supabase = createClient(cookies())
        const {
          data: {user},
          error,
        } = await supabase.auth.getUser()
        if (error || !user) return []
        userId = user.id
      }

      const userBrands = await db
        .select({
          brandId: brands.id,
          brandName: brands.name,
          roleName: roles.name,
        })
        .from(userRoles)
        .leftJoin(brands, eq(userRoles.brandId, brands.id))
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, userId))

      return userBrands
        .filter(item => item.brandId && item.brandName)
        .map(item => ({
          id: item.brandId!,
          name: item.brandName!,
          role: item.roleName || "unknown",
        }))
    } catch (error) {
      console.error("Error getting user brands:", error)
      return []
    }
  }
}

// Export a function that creates a new instance instead of a module-level instance
export function createPermissionService(): PermissionService {
  return new PermissionService()
}

// For backward compatibility, you can also export this way:
export function getPermissionService(): PermissionService {
  return new PermissionService()
}
