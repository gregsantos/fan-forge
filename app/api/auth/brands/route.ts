import {NextRequest, NextResponse} from "next/server"
import {createClient} from "@/utils/supabase/server"
import {cookies} from "next/headers"
import {createPermissionService} from "@/lib/auth/permissions"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const {
      data: {user},
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({error: "Unauthorized"}, {status: 401})
    }

    const permissionService = createPermissionService()
    const brands = await permissionService.getUserBrands(user.id)

    return NextResponse.json({
      brands,
      count: brands.length,
    })
  } catch (error) {
    console.error("User brands API error:", error)
    return NextResponse.json({error: "Internal server error"}, {status: 500})
  }
}
