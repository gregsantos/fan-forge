import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { assets, ipKits, assetIpKits } from '@/db/schema'
import { eq, and, desc, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'
import { getBrandAssets } from '@/lib/data/assets'

// Asset creation schema
const createAssetSchema = z.object({
  filename: z.string(),
  originalFilename: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  category: z.enum(['characters', 'backgrounds', 'logos', 'titles', 'props', 'other']),
  tags: z.array(z.string()).default([]),
  metadata: z.object({
    width: z.number(),
    height: z.number(),
    fileSize: z.number(),
    mimeType: z.string(),
    colorPalette: z.array(z.string()).optional()
  }),
  ipId: z.string().optional(), // Optional blockchain address
  ipKitId: z.string().uuid()
})

// Asset query schema - simplified to handle URL params better
const assetQuerySchema = z.object({
  ipKitId: z.string().uuid().nullable().optional(),
  ipId: z.string().nullable().optional(), // Filter by blockchain address
  category: z.enum(['characters', 'backgrounds', 'logos', 'titles', 'props', 'other']).nullable().optional(),
  search: z.string().nullable().optional(),
  tags: z.string().nullable().optional(), // Comma-separated tags
  limit: z.string().nullable().optional(),
  offset: z.string().nullable().optional(),
  page: z.string().nullable().optional(),
  sortBy: z.string().nullable().optional()
})

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters using simplified schema
    const { searchParams } = new URL(request.url)
    const query = assetQuerySchema.parse({
      ipKitId: searchParams.get('ipKitId'),
      ipId: searchParams.get('ipId'),
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      tags: searchParams.get('tags'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      page: searchParams.get('page'),
      sortBy: searchParams.get('sortBy')
    })

    // Convert to clean params object for shared data layer
    const cleanParams: Record<string, string | undefined> = {}
    
    if (query.ipKitId) cleanParams.ipKitId = query.ipKitId
    if (query.ipId) cleanParams.ipId = query.ipId
    if (query.category) cleanParams.category = query.category
    if (query.search) cleanParams.search = query.search
    if (query.tags) cleanParams.tags = query.tags
    if (query.limit) cleanParams.limit = query.limit
    if (query.offset) cleanParams.offset = query.offset
    if (query.page) cleanParams.page = query.page
    if (query.sortBy) cleanParams.sortBy = query.sortBy

    // Use shared data layer function
    const result = await getBrandAssets(cleanParams)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Assets GET error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const assetData = createAssetSchema.parse(body)

    // Verify that the IP Kit exists and user has access to it
    const ipKit = await db
      .select()
      .from(ipKits)
      .where(eq(ipKits.id, assetData.ipKitId))
      .limit(1)

    if (ipKit.length === 0) {
      return NextResponse.json(
        { error: 'IP Kit not found' },
        { status: 404 }
      )
    }

    // TODO: Add proper authorization check for IP Kit access
    // For now, we'll assume the user has access

    // Create the asset record
    const [newAsset] = await db
      .insert(assets)
      .values({
        ...assetData,
        uploadedBy: user.id
      })
      .returning()

    // Also create the asset-ipkit relationship in the junction table
    await db
      .insert(assetIpKits)
      .values({
        assetId: newAsset.id,
        ipKitId: assetData.ipKitId
      })
      .onConflictDoNothing()

    return NextResponse.json(newAsset, { status: 201 })

  } catch (error) {
    console.error('Assets POST error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid asset data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}