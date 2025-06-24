import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { assets, ipKits, assetIpKits } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { ipKitId } = await request.json()
    const assetId = params.id

    if (!ipKitId) {
      return NextResponse.json({ error: 'IP Kit ID is required' }, { status: 400 })
    }

    // Verify asset exists
    const asset = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1)
    if (!asset.length) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Verify IP kit exists
    const ipKit = await db.select().from(ipKits).where(eq(ipKits.id, ipKitId)).limit(1)
    if (!ipKit.length) {
      return NextResponse.json({ error: 'IP Kit not found' }, { status: 404 })
    }

    // Check if relationship already exists
    const existing = await db
      .select()
      .from(assetIpKits)
      .where(and(eq(assetIpKits.assetId, assetId), eq(assetIpKits.ipKitId, ipKitId)))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Asset already assigned to this IP Kit' }, { status: 409 })
    }

    // Create the relationship
    await db.insert(assetIpKits).values({
      assetId,
      ipKitId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding asset to IP kit:', error)
    return NextResponse.json(
      { error: 'Failed to add asset to IP kit' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { ipKitId } = await request.json()
    const assetId = params.id

    if (!ipKitId) {
      return NextResponse.json({ error: 'IP Kit ID is required' }, { status: 400 })
    }

    // Remove the relationship
    const result = await db
      .delete(assetIpKits)
      .where(and(eq(assetIpKits.assetId, assetId), eq(assetIpKits.ipKitId, ipKitId)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing asset from IP kit:', error)
    return NextResponse.json(
      { error: 'Failed to remove asset from IP kit' },
      { status: 500 }
    )
  }
}