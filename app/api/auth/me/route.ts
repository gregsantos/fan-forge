import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { ensureUserExists } from '@/lib/auth-utils'

async function getCurrentUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers.get('cookie')?.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=')
            return { name, value }
          }) || []
        },
        setAll() {}, // Not needed for read operations
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  // Ensure user exists in our database if authenticated
  if (user) {
    await ensureUserExists(user)
  }
  
  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name || user.email
    })

  } catch (error) {
    console.error('Failed to get current user:', error)
    return NextResponse.json(
      { error: "Failed to get user information" },
      { status: 500 }
    )
  }
}