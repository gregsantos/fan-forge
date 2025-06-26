import {createServerClient, type CookieOptions} from "@supabase/ssr"
import {NextResponse, type NextRequest} from "next/server"

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
          cookiesToSet.forEach(({name, value, options}) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({name, value, options}) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Define route patterns
  const protectedRoutes = [
    "/dashboard",
    "/campaigns",
    "/submissions",
    "/create",
    "/discover",
    "/assets",
    "/ip-kits",
    "/my-submissions",
  ]
  const authRoutes = ["/login", "/register", "/confirm"]
  const brandOnlyRoutes = [
    "/dashboard",
    "/campaigns",
    "/assets",
    "/ip-kits",
    "/submissions",
  ]
  const creatorOnlyRoutes = ["/create", "/my-submissions"]

  const pathname = request.nextUrl.pathname

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  const isBrandOnlyRoute = brandOnlyRoutes.some(route =>
    pathname.startsWith(route)
  )
  const isCreatorOnlyRoute = creatorOnlyRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Use getUser() for security-critical authentication decisions
  const {
    data: {user},
    error,
  } = await supabase.auth.getUser()

  // Only log unexpected auth errors (suppress common transition errors)
  if (error && 
      error.name !== "AuthSessionMissingError" && 
      !error.message?.includes("refresh_token_not_found") &&
      !error.message?.includes("Invalid Refresh Token")) {
    console.error("Auth error in middleware:", error)
  }

  const hasUser = !!user
  const userRole = user?.user_metadata?.role

  // Handle unauthenticated users
  if (isProtectedRoute && !hasUser) {
    const redirectUrl = new URL("/login", request.url)
    redirectUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Handle authenticated users on auth routes (except confirmation)
  if (isAuthRoute && hasUser && !pathname.startsWith("/confirm")) {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo")

    if (redirectTo) {
      // Validate the redirect URL is within our app
      const allowedRedirects = [...protectedRoutes]
      const isValidRedirect = allowedRedirects.some(route =>
        redirectTo.startsWith(route)
      )

      if (isValidRedirect) {
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
    }

    // Default redirect based on role
    const defaultRedirect =
      userRole === "brand_admin" ? "/dashboard" : "/discover"
    return NextResponse.redirect(new URL(defaultRedirect, request.url))
  }

  // Role-based access control for authenticated users
  if (hasUser && isProtectedRoute) {
    // Prevent creators from accessing brand-only routes
    if (userRole === "creator" && isBrandOnlyRoute) {
      return NextResponse.redirect(new URL("/discover", request.url))
    }

    // Prevent brand admins from accessing creator-only routes (optional)
    if (userRole === "brand_admin" && isCreatorOnlyRoute) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
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
    "/((?!_next/static|_next/image|favicon.ico|public|api/).*)",
  ],
}
