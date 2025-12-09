import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, userRoles, roles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📧 Create profile API called with:', body)
    
    const { userId, email, displayName, role } = body

    if (!userId || !email) {
      console.error('❌ Missing required fields:', { userId, email })
      return NextResponse.json(
        { error: 'Missing required fields: userId, email' },
        { status: 400 }
      )
    }

    console.log(`📧 Creating database profile for confirmed user: ${email} (ID: ${userId})`)

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (existingUser.length > 0) {
      // Update email verification status and ensure role exists
      await db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, userId))
      
      // Check if user has a role assigned
      const existingRole = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, userId))
        .limit(1)
      
      if (existingRole.length === 0) {
        // Assign role if missing
        const userRole = role || 'creator'
        const [roleRecord] = await db
          .select()
          .from(roles)
          .where(eq(roles.name, userRole))
          .limit(1)

        if (roleRecord) {
          await db.insert(userRoles).values({
            userId,
            roleId: roleRecord.id,
          })
          console.log(`✅ Assigned missing role '${userRole}' to existing user ${email}`)
        }
      }
      
      console.log(`✅ Updated and ensured complete profile for existing user ${email}`)
      return NextResponse.json({ success: true, message: 'User profile updated and completed' })
    }

    // Create new user profile
    await db.insert(users).values({
      id: userId,
      email,
      displayName: displayName || email.split('@')[0],
      emailVerified: true,
    })

    // Assign role
    const userRole = role || 'creator'
    const [roleRecord] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, userRole))
      .limit(1)

    if (roleRecord) {
      await db.insert(userRoles).values({
        userId,
        roleId: roleRecord.id,
      })
      console.log(`✅ Created profile and assigned role '${userRole}' for ${email}`)
    } else {
      console.error(`❌ Role '${userRole}' not found, user profile created without role`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User profile created successfully' 
    })

  } catch (error) {
    console.error('❌ Error creating user profile:', error)
    return NextResponse.json(
      { error: 'Failed to create user profile', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}