import { NextRequest, NextResponse } from "next/server"

// Mock bookmarks storage (in a real app, this would be in a database)
let mockBookmarks: { userId: string; campaignId: string; createdAt: Date }[] = [
  { userId: "user-1", campaignId: "campaign-1", createdAt: new Date() },
  { userId: "user-1", campaignId: "campaign-3", createdAt: new Date() },
]

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get("userId") || "user-1" // Mock user ID
  
  try {
    // Get user's bookmarks
    const userBookmarks = mockBookmarks
      .filter(bookmark => bookmark.userId === userId)
      .map(bookmark => bookmark.campaignId)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200))

    return NextResponse.json({
      bookmarks: userBookmarks,
      count: userBookmarks.length
    })
  } catch (error) {
    console.error("Failed to fetch bookmarks:", error)
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaignId, userId = "user-1" } = body // Mock user ID

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      )
    }

    // Check if bookmark already exists
    const existingBookmark = mockBookmarks.find(
      bookmark => bookmark.userId === userId && bookmark.campaignId === campaignId
    )

    if (existingBookmark) {
      return NextResponse.json(
        { error: "Campaign already bookmarked" },
        { status: 409 }
      )
    }

    // Add bookmark
    const newBookmark = {
      userId,
      campaignId,
      createdAt: new Date()
    }
    
    mockBookmarks.push(newBookmark)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))

    return NextResponse.json({
      message: "Campaign bookmarked successfully",
      bookmark: newBookmark
    }, { status: 201 })

  } catch (error) {
    console.error("Failed to create bookmark:", error)
    return NextResponse.json(
      { error: "Failed to bookmark campaign" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get("campaignId")
    const userId = searchParams.get("userId") || "user-1" // Mock user ID

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID is required" },
        { status: 400 }
      )
    }

    // Find and remove bookmark
    const bookmarkIndex = mockBookmarks.findIndex(
      bookmark => bookmark.userId === userId && bookmark.campaignId === campaignId
    )

    if (bookmarkIndex === -1) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      )
    }

    mockBookmarks.splice(bookmarkIndex, 1)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200))

    return NextResponse.json({
      message: "Bookmark removed successfully"
    })

  } catch (error) {
    console.error("Failed to remove bookmark:", error)
    return NextResponse.json(
      { error: "Failed to remove bookmark" },
      { status: 500 }
    )
  }
}