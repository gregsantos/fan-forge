"use client"

import {usePathname} from "next/navigation"
import {useAuth} from "@/lib/contexts/auth"
import {Navigation} from "@/components/shared/navigation"
import {useEffect, useState} from "react"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({children}: ConditionalLayoutProps) {
  const pathname = usePathname()
  const {user, loading} = useAuth()
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side to avoid hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Define the home page (special case - show nav only if authenticated)
  const isHomePage = pathname === "/"

  // Show navigation logic:
  // - Home page: only show if user is authenticated (avoid flash)
  // - All other routes: Navigation component handles its own conditional logic
  // - Wait for client-side hydration to avoid mismatch
  const shouldShowNavigation = !isClient
    ? false // Hide during hydration to avoid flash
    : isHomePage
      ? user && !loading
      : true

  return (
    <div className='min-h-screen bg-background'>
      {shouldShowNavigation && <Navigation />}
      <main id='main-content' className={shouldShowNavigation ? "" : ""}>
        {children}
      </main>
    </div>
  )
}
