import {NextRequest, NextResponse} from "next/server"
import {createClient} from "@/utils/supabase/server"
import {cookies} from "next/headers"
import {createPermissionService} from "@/lib/auth/permissions"
import {db, brands, userRoles, roles} from "@/db"
import {eq, and} from "drizzle-orm"
import {z} from "zod"
import {clearUserRoleCache} from "@/lib/auth-utils"

const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(100, "Brand name too long"),
  description: z.string().optional(),
})

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
    const userBrands = await permissionService.getUserBrands(user.id)

    return NextResponse.json({
      brands: userBrands,
      count: userBrands.length,
    })
  } catch (error) {
    console.error("User brands API error:", error)
    return NextResponse.json({error: "Internal server error"}, {status: 500})
  }
}

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createBrandSchema.parse(body)

    // Check if user is a brand admin
    const [brandAdminRole] = await db
      .select({id: roles.id})
      .from(roles)
      .where(eq(roles.name, "brand_admin"))
      .limit(1)

    if (!brandAdminRole) {
      return NextResponse.json({error: "Brand admin role not found"}, {status: 500})
    }

    const existingRole = await db
      .select()
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, user.id),
        eq(userRoles.roleId, brandAdminRole.id)
      ))
      .limit(1)

    if (existingRole.length === 0) {
      return NextResponse.json({error: "Only brand administrators can create brands"}, {status: 403})
    }

    // Create the brand
    const [newBrand] = await db
      .insert(brands)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        ownerId: user.id,
      })
      .returning()

    // Update the existing user role to associate with the new brand
    console.log(`🔄 Updating user role for user ${user.id} with brand ${newBrand.id}`)
    
    await db
      .update(userRoles)
      .set({
        brandId: newBrand.id,
      })
      .where(and(
        eq(userRoles.userId, user.id),
        eq(userRoles.roleId, brandAdminRole.id)
      ))

    // Verify the update worked by querying the updated role
    const updatedRole = await db
      .select({ brandId: userRoles.brandId })
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, user.id),
        eq(userRoles.roleId, brandAdminRole.id)
      ))
      .limit(1)

    if (!updatedRole.length || updatedRole[0].brandId !== newBrand.id) {
      console.error(`❌ Failed to update user role for user ${user.id} with brand ${newBrand.id}`)
      return NextResponse.json({
        error: "Failed to associate user with brand"
      }, {status: 500})
    }

    console.log(`✅ Successfully associated user ${user.id} with brand ${newBrand.id}`)

    // Clear the user's role cache so the dashboard refreshes properly
    clearUserRoleCache(user.id)

    return NextResponse.json({
      brand: newBrand,
      message: "Brand created successfully",
    }, {status: 201})
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: "Validation failed",
        details: error.errors,
      }, {status: 400})
    }

    console.error("Create brand API error:", error)
    return NextResponse.json({error: "Internal server error"}, {status: 500})
  }
}
