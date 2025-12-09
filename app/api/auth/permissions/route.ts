import {NextRequest, NextResponse} from "next/server"
import {createClient} from "@/utils/supabase/server"
import {cookies} from "next/headers"
import {createPermissionService} from "@/lib/auth/permissions"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const {
      data: {user},
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({error: "Unauthorized"}, {status: 401})
    }

    const permissionService = createPermissionService()
    const permissions = await permissionService.getUserPermissions(user.id)

    if (!permissions) {
      return NextResponse.json(
        {error: "Unable to load permissions"},
        {status: 500}
      )
    }

    // Convert the permission object to a serializable format
    // Note: The function properties need to be removed for JSON serialization
    const serializablePermissions = {
      canCreateIpKits: permissions.canCreateIpKits,
      canCreateCampaigns: permissions.canCreateCampaigns,
      canReviewSubmissions: permissions.canReviewSubmissions,
      isPlatformAdmin: permissions.isPlatformAdmin,
      userBrands: permissions.userBrands,
    }

    return NextResponse.json(serializablePermissions)
  } catch (error) {
    console.error("Permissions API error:", error)
    return NextResponse.json({error: "Internal server error"}, {status: 500})
  }
}
