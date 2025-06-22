import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/campaigns', '/submissions', '/create', '/portfolio', '/discover', '/assets', '/ip-kits', '/my-submissions']
  const authRoutes = ['/login', '/register', '/confirm']
  const brandOnlyRoutes = ['/dashboard', '/campaigns', '/assets', '/ip-kits', '/submissions']
  const creatorOnlyRoutes = ['/create', '/my-submissions', '/portfolio']
  
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  const isBrandOnlyRoute = brandOnlyRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )
  const isCreatorOnlyRoute = creatorOnlyRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based access control
  if (user && isProtectedRoute) {
    const userRole = user.user_metadata?.role
    
    // Prevent creators from accessing brand-only routes
    if (userRole === 'creator' && isBrandOnlyRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/discover'
      return NextResponse.redirect(redirectUrl)
    }
    
    // Prevent brand admins from accessing creator-only routes (optional)
    if (userRole === 'brand_admin' && isCreatorOnlyRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect authenticated users from auth routes to appropriate page
  // Exception: don't redirect from /confirm as users need to complete email confirmation
  if (isAuthRoute && user && !request.nextUrl.pathname.startsWith('/confirm')) {
    const redirectUrl = request.nextUrl.clone()
    
    // Check if there's a redirectTo parameter
    const redirectTo = request.nextUrl.searchParams.get('redirectTo')
    
    if (redirectTo) {
      // Use the redirectTo parameter if present
      redirectUrl.pathname = redirectTo
      redirectUrl.searchParams.delete('redirectTo')
    } else {
      // Get user role from metadata
      const userRole = user.user_metadata?.role
      
      // Redirect based on role: creators to discover, brand admins to dashboard
      if (userRole === 'creator') {
        redirectUrl.pathname = '/discover'
      } else if (userRole === 'brand_admin') {
        redirectUrl.pathname = '/dashboard'
      } else {
        // Default fallback to discover for unknown roles
        redirectUrl.pathname = '/discover'
      }
    }
    
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/).*)',
  ],
}