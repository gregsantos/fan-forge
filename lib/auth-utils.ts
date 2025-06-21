import { db } from '@/db'
import { users, userRoles, roles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { User } from '@supabase/supabase-js'

/**
 * Ensures a user exists in our custom users table
 * This is useful for handling cases where users exist in Supabase Auth
 * but not yet in our custom database schema
 * Only creates profile for users with confirmed emails
 */
export async function ensureUserExists(supabaseUser: User): Promise<void> {
  try {
    // Only create profile for users with confirmed emails
    if (!supabaseUser.email_confirmed_at) {
      console.log(`Skipping profile creation for unconfirmed user: ${supabaseUser.email}`)
      return
    }

    // Check if user already exists in our database
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, supabaseUser.id))
      .limit(1)

    if (existingUser.length > 0) {
      // User already exists, ensure email verification status is current
      await db
        .update(users)
        .set({ emailVerified: !!supabaseUser.email_confirmed_at })
        .where(eq(users.id, supabaseUser.id))
      return
    }

    console.log(`Creating user profile for confirmed user: ${supabaseUser.email}`)

    // Create user profile in our database
    const displayName = supabaseUser.user_metadata?.display_name || 
                       supabaseUser.user_metadata?.full_name || 
                       supabaseUser.email?.split('@')[0] || 
                       'User'

    await db.insert(users).values({
      id: supabaseUser.id,
      email: supabaseUser.email!,
      displayName,
      avatarUrl: supabaseUser.user_metadata?.avatar_url,
      emailVerified: !!supabaseUser.email_confirmed_at,
    })

    // Assign default role if user doesn't have one
    const existingRole = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, supabaseUser.id))
      .limit(1)

    if (existingRole.length === 0) {
      // Assign default creator role
      const defaultRole = supabaseUser.user_metadata?.role || 'creator'
      
      const [roleRecord] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, defaultRole))
        .limit(1)

      if (roleRecord) {
        await db.insert(userRoles).values({
          userId: supabaseUser.id,
          roleId: roleRecord.id,
        })
        console.log(`Assigned default role '${defaultRole}' to user ${supabaseUser.email}`)
      }
    }

  } catch (error) {
    console.error('Error ensuring user exists:', error)
    // Don't throw here as this is a background operation
    // The application should still work even if this fails
  }
}

/**
 * Gets user with roles from our database
 */
export async function getUserWithRoles(userId: string) {
  try {
    const result = await db
      .select({
        user: users,
        role: {
          id: roles.id,
          name: roles.name,
          description: roles.description,
          permissions: roles.permissions,
        },
        brandId: userRoles.brandId,
      })
      .from(users)
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(users.id, userId))

    if (result.length === 0) {
      return null
    }

    const user = result[0].user
    const userRolesData = result
      .filter(r => r.role)
      .map(r => ({
        role: r.role!,
        brandId: r.brandId,
      }))

    return {
      ...user,
      roles: userRolesData,
    }
  } catch (error) {
    console.error('Error getting user with roles:', error)
    return null
  }
}