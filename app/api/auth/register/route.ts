import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { users, userRoles, roles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(['creator', 'brand_admin'], {
    errorMap: () => ({ message: 'Role must be either creator or brand_admin' })
  })
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          display_name: validatedData.displayName,
          role: validatedData.role,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/confirm`
      }
    })

    if (authError) throw authError

    // Only create user profile immediately if email is already confirmed
    // Otherwise, it will be created in the confirmation callback
    if (authData.user && authData.user.email_confirmed_at) {
      try {
        // Check if user already exists (in case of retry)
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.id, authData.user.id))
          .limit(1)

        if (existingUser.length === 0) {
          // Create user profile
          await db.insert(users).values({
            id: authData.user.id,
            email: authData.user.email!,
            displayName: validatedData.displayName,
            emailVerified: false,
          })
          console.log(`✅ Created user profile for ${authData.user.email}`)
        } else {
          console.log(`ℹ️  User profile already exists for ${authData.user.email}`)
        }

        // Assign role
        const [roleRecord] = await db
          .select()
          .from(roles)
          .where(eq(roles.name, validatedData.role))
          .limit(1)

        if (!roleRecord) {
          console.error(`❌ Role '${validatedData.role}' not found in database`)
          throw new Error(`Role '${validatedData.role}' not found`)
        }

        // Check if role assignment already exists
        const existingRole = await db
          .select()
          .from(userRoles)
          .where(
            eq(userRoles.userId, authData.user.id)
          )
          .limit(1)

        if (existingRole.length === 0) {
          await db.insert(userRoles).values({
            userId: authData.user.id,
            roleId: roleRecord.id,
          })
          console.log(`✅ Assigned role '${validatedData.role}' to user ${authData.user.email}`)
        } else {
          console.log(`ℹ️  User role already assigned for ${authData.user.email}`)
        }

      } catch (dbError) {
        console.error('❌ Error creating user profile:', dbError)
        
        // If user profile creation fails, we should clean up the Supabase user
        // to prevent orphaned auth records
        try {
          await supabase.auth.admin.deleteUser(authData.user.id)
          console.log('🧹 Cleaned up orphaned Supabase user due to profile creation failure')
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup orphaned user:', cleanupError)
        }
        
        throw new Error('Failed to create user profile. Registration aborted.')
      }
    }

    const needsEmailConfirmation = !authData.user?.email_confirmed_at
    
    return NextResponse.json({
      success: true,
      user: authData.user,
      needsEmailConfirmation,
      message: needsEmailConfirmation 
        ? 'Registration successful. Please check your email for verification.'
        : 'Registration successful. You are now logged in.'
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      }, { status: 400 })
    }

    // Handle Supabase auth errors
    if (error && typeof error === 'object' && 'message' in error) {
      return NextResponse.json({
        success: false,
        message: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      message: 'Registration failed'
    }, { status: 500 })
  }
}