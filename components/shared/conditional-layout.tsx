"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/contexts/auth"
import { Navigation } from "@/components/shared/navigation"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Define routes where navigation should be hidden for unauthenticated users
  const publicRoutes = [
    "/",
    "/login",
    "/register", 
    "/forgot-password",
    "/reset-password",
    "/auth/confirm",
    "/auth/callback"
  ]

  // Check if current route is public and user is not authenticated
  const isPublicRoute = publicRoutes.includes(pathname)
  const shouldHideNavigation = isPublicRoute && !user && !loading

  return (
    <div className="min-h-screen bg-background">
      {!shouldHideNavigation && <Navigation />}
      <main id="main-content" className={shouldHideNavigation ? "" : ""}>{children}</main>
    </div>
  )
}