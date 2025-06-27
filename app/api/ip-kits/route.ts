import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { ipKits, brands, assets } from '@/db/schema'
import { eq, and, desc, ilike, count, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getUserBrandIds } from '@/lib/auth-utils'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// IP Kit creation schema
const createIpKitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  guidelines: z.string().optional(),
  brandId: z.string().uuid('Invalid brand ID'),
  isPublished: z.boolean().default(false)
})

// IP Kit update schema
const updateIpKitSchema = createIpKitSchema.partial().extend({
  id: z.string().uuid('Invalid IP Kit ID')
})

// IP Kit query schema
const ipKitQuerySchema = z.object({
  brandId: z.string().uuid().nullable().optional(),
  search: z.string().nullable().optional(),
  published: z.enum(['true', 'false', 'all']).nullable().default('all'),
  limit: z.string().nullable().optional(),
  offset: z.string().nullable().optional()
}).transform(data => ({
  brandId: data.brandId || undefined,
  search: data.search || undefined,
  published: data.published || 'all',
  limit: data.limit ? Math.max(1, Math.min(100, parseInt(data.limit) || 20)) : 20,
  offset: data.offset ? Math.max(0, parseInt(data.offset) || 0) : 0
}))

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
    const query = ipKitQuerySchema.parse({
      brandId: searchParams.get('brandId'),
      search: searchParams.get('search'),
      published: searchParams.get('published'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    })

    // Build where conditions for database query
    const whereConditions = []

    // SECURITY: Filter IP kits by user's brand access
    const userBrandIds = await getUserBrandIds(user.id)
    if (userBrandIds.length > 0) {
      whereConditions.push(inArray(ipKits.brandId, userBrandIds))
    } else {
      // User has no brand access, show no IP kits
      whereConditions.push(eq(ipKits.id, 'no-access'))
    }

    if (query.brandId) {
      whereConditions.push(eq(ipKits.brandId, query.brandId))
    }

    if (query.search) {
      whereConditions.push(
        ilike(ipKits.name, `%${query.search}%`)
      )
    }

    if (query.published !== 'all') {
      const isPublished = query.published === 'true'
      whereConditions.push(eq(ipKits.isPublished, isPublished))
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined

    // Get IP kits with brand info and asset count
    const ipKitResults = await db
      .select({
        ipKit: ipKits,
        brand: brands,
        assetCount: count(assets.id),
      })
      .from(ipKits)
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .leftJoin(assets, eq(ipKits.id, assets.ipKitId))
      .where(whereClause)
      .groupBy(ipKits.id, brands.id)
      .orderBy(desc(ipKits.updatedAt))
      .limit(query.limit)
      .offset(query.offset)

    // Get total count for pagination
    const [totalResult] = await db
      .select({ count: count() })
      .from(ipKits)
      .leftJoin(brands, eq(ipKits.brandId, brands.id))
      .where(whereClause)

    const total = totalResult.count

    const result = ipKitResults.map(result => ({
      id: result.ipKit.id,
      name: result.ipKit.name,
      description: result.ipKit.description,
      guidelines: result.ipKit.guidelines,
      brandId: result.ipKit.brandId,
      isPublished: result.ipKit.isPublished,
      version: result.ipKit.version,
      createdAt: result.ipKit.createdAt,
      updatedAt: result.ipKit.updatedAt,
      brandName: result.brand?.name || "Unknown Brand",
      assetCount: result.assetCount || 0
    }))

    return NextResponse.json({
      ipKits: result,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < total,
        total: total
      }
    })

  } catch (error) {
    console.error('IP Kits GET error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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
    const ipKitData = createIpKitSchema.parse(body)

    // Verify brand exists
    const existingBrand = await db
      .select()
      .from(brands)
      .where(eq(brands.id, ipKitData.brandId))
      .limit(1)
    
    if (existingBrand.length === 0) {
      return NextResponse.json(
        { error: 'Brand not found' },
        { status: 404 }
      )
    }

    // SECURITY: Verify user has access to this brand
    const userBrandIds = await getUserBrandIds(user.id)
    if (!userBrandIds.includes(ipKitData.brandId)) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this brand' },
        { status: 403 }
      )
    }

    // Create new IP Kit in database
    const [newIpKit] = await db
      .insert(ipKits)
      .values({
        name: ipKitData.name,
        description: ipKitData.description,
        guidelines: ipKitData.guidelines,
        brandId: ipKitData.brandId,
        isPublished: ipKitData.isPublished,
        version: 1,
      })
      .returning()

    return NextResponse.json(newIpKit, { status: 201 })

  } catch (error) {
    console.error('IP Kits POST error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid IP Kit data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}