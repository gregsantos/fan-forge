import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { assets, ipKits, assetIpKits } from '@/db/schema'
import { eq, and, desc, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'

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

// Asset query schema
const assetQuerySchema = z.object({
  ipKitId: z.string().uuid().optional(),
  ipId: z.string().optional(), // Filter by blockchain address
  category: z.enum(['characters', 'backgrounds', 'logos', 'titles', 'props', 'other']).optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
})

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = assetQuerySchema.parse({
      ipKitId: searchParams.get('ipKitId'),
      ipId: searchParams.get('ipId'),
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      tags: searchParams.get('tags'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    })

    // Build query conditions
    const conditions = []

    if (query.ipKitId) {
      conditions.push(eq(assets.ipKitId, query.ipKitId))
    }

    if (query.ipId) {
      conditions.push(eq(assets.ipId, query.ipId))
    }

    if (query.category) {
      conditions.push(eq(assets.category, query.category))
    }

    if (query.search) {
      conditions.push(ilike(assets.filename, `%${query.search}%`))
    }

    // For now, we'll implement basic tag filtering using JSON operators
    if (query.tags) {
      const tagList = query.tags.split(',').map(tag => tag.trim())
      // Use JSON operators for tag filtering
      const tagConditions = tagList.map(tag => 
        sql`${assets.tags} @> ${JSON.stringify([tag])}`
      )
      if (tagConditions.length > 0) {
        conditions.push(sql`(${sql.join(tagConditions, sql` OR `)})`)
      }
    }

    // Execute query
    const result = await db
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
        ipKitId: assets.ipKitId,
        uploadedBy: assets.uploadedBy,
        createdAt: assets.createdAt
      })
      .from(assets)
      .where(conditions.length > 0 ? and(...conditions) : sql`true`)
      .orderBy(desc(assets.createdAt))
      .limit(query.limit)
      .offset(query.offset)

    return NextResponse.json({
      assets: result,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: result.length === query.limit
      }
    })

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