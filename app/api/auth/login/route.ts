import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    })

    if (error) throw error

    return NextResponse.json({
      success: true,
      user: authData.user,
      session: authData.session,
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Login error:', error)

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
      }, { status: 401 })
    }

    return NextResponse.json({
      success: false,
      message: 'Login failed'
    }, { status: 500 })
  }
}