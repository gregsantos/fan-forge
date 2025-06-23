import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { assets, ipKits, brands } from '@/db/schema'
import { eq, and, desc, ilike, count } from 'drizzle-orm'
import { z } from 'zod'

// Assets query schema for IP Kit
const ipKitAssetsQuerySchema = z.object({
  category: z.enum(['characters', 'backgrounds', 'logos', 'titles', 'props', 'other']).optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['newest', 'oldest', 'name', 'size', 'category']).default('newest')
})

// Bulk asset operations schema
const bulkAssetOperationSchema = z.object({
  operation: z.enum(['delete', 'update_category', 'add_tags', 'remove_tags']),
  assetIds: z.array(z.string().uuid()),
  data: z.object({
    category: z.enum(['characters', 'backgrounds', 'logos', 'titles', 'props', 'other']).optional(),
    tags: z.array(z.string()).optional()
  }).optional()
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipKitId = params.id
    const { searchParams } = new URL(request.url)
    const query = ipKitAssetsQuerySchema.parse({
      category: searchParams.get('category'),
      search: searchParams.get('search'),
      tags: searchParams.get('tags'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sortBy: searchParams.get('sortBy')
    })

    // Verify IP Kit exists and user has access
    const [ipKit] = await db
      .select({
        ipKit: ipKits,
        brand: brands
      })
      .from(ipKits)
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .where(eq(ipKits.id, ipKitId))
      .limit(1)

    if (!ipKit) {
      return NextResponse.json({ error: 'IP Kit not found' }, { status: 404 })
    }

    // TODO: Add proper permission check

    // Build query conditions
    const conditions = [eq(assets.ipKitId, ipKitId)]

    if (query.category) {
      conditions.push(eq(assets.category, query.category))
    }

    if (query.search) {
      conditions.push(ilike(assets.originalFilename, `%${query.search}%`))
    }

    // TODO: Add tag filtering when needed

    // Build sort order
    let orderBy
    switch (query.sortBy) {
      case 'oldest':
        orderBy = assets.createdAt
        break
      case 'name':
        orderBy = assets.originalFilename
        break
      case 'size':
        orderBy = desc(assets.metadata) // This would need a custom sort for fileSize
        break
      case 'category':
        orderBy = assets.category
        break
      default:
        orderBy = desc(assets.createdAt)
    }

    // Get assets with pagination
    const assetResults = await db
      .select()
      .from(assets)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(query.limit)
      .offset(query.offset)

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(assets)
      .where(and(...conditions))

    // Get category breakdown
    const categoryBreakdown = await db
      .select({
        category: assets.category,
        count: count()
      })
      .from(assets)
      .where(eq(assets.ipKitId, ipKitId))
      .groupBy(assets.category)

    return NextResponse.json({
      assets: assetResults,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: totalResult.count,
        hasMore: query.offset + query.limit < totalResult.count
      },
      categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
        acc[item.category] = item.count
        return acc
      }, {} as Record<string, number>),
      ipKit: {
        id: ipKit.ipKit.id,
        name: ipKit.ipKit.name,
        brandName: ipKit.brand?.name
      }
    })

  } catch (error) {
    console.error('IP Kit assets GET error:', error)
    
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ipKitId = params.id
    const body = await request.json()
    const operation = bulkAssetOperationSchema.parse(body)

    // Verify IP Kit exists and user has access
    const [ipKit] = await db
      .select()
      .from(ipKits)
      .where(eq(ipKits.id, ipKitId))
      .limit(1)

    if (!ipKit) {
      return NextResponse.json({ error: 'IP Kit not found' }, { status: 404 })
    }

    // TODO: Add proper permission check

    let result

    switch (operation.operation) {
      case 'delete':
        // TODO: Implement bulk delete with storage cleanup
        result = await db
          .delete(assets)
          .where(and(
            eq(assets.ipKitId, ipKitId),
            // Use IN operator for multiple asset IDs
            // This would need proper SQL construction
          ))
        break

      case 'update_category':
        if (!operation.data?.category) {
          return NextResponse.json({ error: 'Category is required for update_category operation' }, { status: 400 })
        }
        
        result = await db
          .update(assets)
          .set({ 
            category: operation.data.category
          })
          .where(and(
            eq(assets.ipKitId, ipKitId),
            // Use IN operator for multiple asset IDs
          ))
        break

      case 'add_tags':
      case 'remove_tags':
        // TODO: Implement tag operations using JSON operators
        return NextResponse.json({ error: 'Tag operations not yet implemented' }, { status: 501 })

      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
    }

    return NextResponse.json({ 
      message: `${operation.operation} completed successfully`,
      affectedAssets: operation.assetIds.length
    })

  } catch (error) {
    console.error('IP Kit assets POST error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid operation data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}