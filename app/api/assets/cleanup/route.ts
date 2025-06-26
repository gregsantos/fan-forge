import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { assets } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getUserBrandIds } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has brand access
    const userBrandIds = await getUserBrandIds(user.id)
    if (userBrandIds.length === 0) {
      return NextResponse.json(
        { error: 'Unauthorized: You must belong to a brand to clean up assets' },
        { status: 403 }
      )
    }

    // Get all assets
    const allAssets = await db.select().from(assets)
    
    const orphanedAssets = []
    
    // Check each asset URL to see if it exists in storage
    for (const asset of allAssets) {
      try {
        // Try to get the file info from Supabase Storage
        const path = asset.url.split('/storage/v1/object/public/assets/')[1]
        if (path) {
          const { data } = supabase.storage
            .from('assets')
            .getPublicUrl(path)
          
          // Try to fetch the URL to see if it actually exists
          const response = await fetch(data.publicUrl, { method: 'HEAD' })
          if (!response.ok && response.status === 404) {
            orphanedAssets.push(asset)
          }
        }
      } catch (error) {
        // If we can't check the asset, assume it's orphaned
        orphanedAssets.push(asset)
      }
    }

    // Delete orphaned assets from database
    let deletedCount = 0
    for (const orphanedAsset of orphanedAssets) {
      try {
        await db.delete(assets).where(eq(assets.id, orphanedAsset.id))
        deletedCount++
      } catch (error) {
        console.error('Failed to delete orphaned asset:', orphanedAsset.id, error)
      }
    }

    return NextResponse.json({
      message: `Cleanup complete. Removed ${deletedCount} orphaned assets.`,
      deletedCount,
      orphanedAssets: orphanedAssets.map(a => ({
        id: a.id,
        filename: a.filename,
        url: a.url
      }))
    })

  } catch (error) {
    console.error('Asset cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}