import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { assets, ipKits, assetIpKits } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getUserBrandIds } from '@/lib/auth-utils'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string      // IP Kit ID
    assetId: string // Asset ID
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipKitId = params.id
    const assetId = params.assetId

    // Verify IP Kit exists and user has access
    const [ipKit] = await db
      .select()
      .from(ipKits)
      .where(eq(ipKits.id, ipKitId))
      .limit(1)

    if (!ipKit) {
      return NextResponse.json({ error: 'IP Kit not found' }, { status: 404 })
    }

    // SECURITY: Verify user has access to this IP kit's brand
    const userBrandIds = await getUserBrandIds(user.id)
    if (!userBrandIds.includes(ipKit.brandId)) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this IP kit' },
        { status: 403 }
      )
    }

    // Verify the asset is actually in this IP kit
    const existingRelation = await db
      .select()
      .from(assetIpKits)
      .where(
        and(
          eq(assetIpKits.ipKitId, ipKitId),
          eq(assetIpKits.assetId, assetId)
        )
      )
      .limit(1)

    if (existingRelation.length === 0) {
      return NextResponse.json(
        { error: 'Asset is not in this IP kit' },
        { status: 404 }
      )
    }

    // Remove the asset from the IP kit (not delete the asset itself)
    await db
      .delete(assetIpKits)
      .where(
        and(
          eq(assetIpKits.ipKitId, ipKitId),
          eq(assetIpKits.assetId, assetId)
        )
      )

    return NextResponse.json({
      message: 'Asset removed from IP kit successfully'
    })

  } catch (error) {
    console.error('Remove asset from IP kit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}