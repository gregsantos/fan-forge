"use client"

import {usePathname} from "next/navigation"
import {useAuth} from "@/lib/contexts/auth"
import {Navigation} from "@/components/shared/navigation"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({children}: ConditionalLayoutProps) {
  const pathname = usePathname()
  const {user, loading} = useAuth()

  // Define routes where navigation should be hidden for unauthenticated users
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/auth/confirm",
    "/auth/callback",
  ]

  // Check if current route is public
  const isPublicRoute = publicRoutes.includes(pathname)

  // Show navigation logic:
  // - On protected routes: always show navigation (since auth is required anyway)
  // - On public routes: only show if user is authenticated
  // - While loading: don't show navigation on public routes to avoid flash
  const shouldShowNavigation = isPublicRoute ? user && !loading : true

  return (
    <div className='min-h-screen bg-background'>
      {shouldShowNavigation && <Navigation />}
      <main id='main-content' className={shouldShowNavigation ? "" : ""}>
        {children}
      </main>
    </div>
  )
}
