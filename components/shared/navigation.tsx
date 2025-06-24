"use client"

import Link from "next/link"
import {usePathname} from "next/navigation"
import {cn} from "@/lib/utils"
import {Button} from "@/components/ui/button"
import {ThemeToggle} from "@/components/ui/theme-toggle"
import {UserDropdown} from "@/components/shared/user-dropdown"
import {useAuth} from "@/lib/contexts/auth"
import {
  Menu,
  X,
  Palette,
  Search,
  User as UserIcon,
  BarChart3,
  FileText,
  Eye,
  Image,
  Package,
  User,
  LogOut,
} from "lucide-react"
import {useState, useEffect, useMemo} from "react"
import {useRouter} from "next/navigation"

export function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const {user, signOut, loading, isClient} = useAuth()
  const router = useRouter()

  const creatorLinks = useMemo(
    () => [
      {href: "/discover", label: "Discover", icon: Search},
      {href: "/my-submissions", label: "My Submissions", icon: Eye},
    ],
    []
  )

  const brandLinks = useMemo(
    () => [
      {href: "/dashboard", label: "Dashboard", icon: BarChart3},
      {href: "/ip-kits", label: "IP Kits", icon: Package},
      {href: "/campaigns", label: "Campaigns", icon: FileText},
      {href: "/assets", label: "Assets", icon: Image},
      {href: "/submissions", label: "Submissions", icon: Eye},
    ],
    []
  )

  // Determine navigation links based on user role
  const links = useMemo(() => {
    if (!user) return []

    if (user.role === "creator") {
      return creatorLinks
    } else if (user.role === "brand_admin") {
      return brandLinks
    } else {
      // Fallback for undefined or unknown roles - default to creator links
      return creatorLinks
    }
  }, [user, creatorLinks, brandLinks])

  const handleSignOut = async () => {
    try {
      await signOut()
      setMobileMenuOpen(false)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger on Alt + key to avoid conflicts
      if (!event.altKey || !user) return

      const key = event.key.toLowerCase()
      const isCreator = user.role === "creator"
      const isBrandAdmin = user.role === "brand_admin"

      switch (key) {
        case "d":
          event.preventDefault()
          router.push(isCreator ? "/discover" : "/dashboard")
          break
        case "c":
          event.preventDefault()
          router.push(isCreator ? "/create" : "/campaigns")
          break
        case "i":
          event.preventDefault()
          if (isBrandAdmin) {
            router.push("/ip-kits")
          }
          break
        case "a":
          event.preventDefault()
          if (isBrandAdmin) {
            router.push("/assets")
          }
          break
        case "s":
          event.preventDefault()
          if (isBrandAdmin) {
            router.push("/submissions")
          } else if (isCreator) {
            router.push("/my-submissions")
          }
          break
        case "escape":
          setMobileMenuOpen(false)
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [user, router, creatorLinks, brandLinks])

  return (
    <>
      {/* Skip to content link for accessibility */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50'
      >
        Skip to main content
      </a>
      <nav className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 justify-between'>
            <div className='flex'>
              <Link href='/' className='flex items-center'>
                <span className='text-xl font-bold text-primary'>FanForge</span>
              </Link>

              {!isClient || loading ? (
                <div className='hidden md:ml-10 md:flex md:space-x-8'>
                  {/* Loading skeleton for navigation links */}
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className='inline-flex items-center px-1 pt-1'>
                      <div className='h-4 w-4 bg-muted animate-pulse rounded mr-2' />
                      <div className='h-4 w-16 bg-muted animate-pulse rounded' />
                    </div>
                  ))}
                </div>
              ) : (
                user &&
                links.length > 0 && (
                  <div className='hidden md:ml-10 md:flex md:space-x-8'>
                    {links.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors",
                          pathname === link.href
                            ? "border-b-2 border-primary text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <link.icon className='mr-2 h-4 w-4' />
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className='flex items-center space-x-4'>
              <ThemeToggle />
              {!isClient || loading ? (
                <div className='hidden md:flex md:items-center'>
                  <div className='h-8 w-8 animate-pulse rounded-full bg-muted'></div>
                </div>
              ) : !user ? (
                <div className='hidden md:flex md:space-x-2'>
                  <Link href='/login'>
                    <Button variant='ghost' size='sm'>
                      Sign In
                    </Button>
                  </Link>
                  <Link href='/register'>
                    <Button size='sm'>Get Started</Button>
                  </Link>
                </div>
              ) : (
                <div className='hidden md:flex md:items-center md:space-x-3'>
                  <div className='flex items-center space-x-2 text-sm text-muted-foreground'>
                    <span className='hidden lg:inline'>
                      {user.role === "brand_admin" ? "Brand Admin" : ""}
                    </span>
                    <span className='font-medium text-foreground'>
                      {user.displayName || user.email.split("@")[0]}
                    </span>
                  </div>
                  <UserDropdown />
                </div>
              )}

              {/* Mobile menu button */}
              <div className='md:hidden'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? (
                    <X className='h-6 w-6' />
                  ) : (
                    <Menu className='h-6 w-6' />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className='md:hidden'>
            <div className='space-y-1 px-2 pb-3 pt-2'>
              {!isClient || loading ? (
                <div className='space-y-2'>
                  {/* Loading skeleton for mobile menu */}
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className='flex items-center rounded-md px-3 py-2'
                    >
                      <div className='h-5 w-5 bg-muted animate-pulse rounded mr-3' />
                      <div className='h-4 w-20 bg-muted animate-pulse rounded' />
                    </div>
                  ))}
                </div>
              ) : user ? (
                <>
                  {links.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center rounded-md px-3 py-2 text-base font-medium transition-colors",
                        pathname === link.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <link.icon className='mr-3 h-5 w-5' />
                      {link.label}
                    </Link>
                  ))}
                  <div className='border-t pt-4'>
                    <div className='flex items-center px-3 py-2 space-x-3'>
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-xs font-semibold ${
                          user.role === "creator"
                            ? "bg-blue-500"
                            : user.role === "brand_admin"
                              ? "bg-purple-500"
                              : "bg-gray-500"
                        }`}
                      >
                        {user.displayName
                          ? user.displayName[0].toUpperCase()
                          : user.email[0].toUpperCase()}
                      </div>
                      <div className='flex-1'>
                        <div className='text-sm font-medium'>
                          {user.displayName || user.email.split("@")[0]}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {user.role === "creator"
                            ? "Creator"
                            : user.role === "brand_admin"
                              ? "Brand Admin"
                              : "User"}
                        </div>
                      </div>
                    </div>
                    <div className='px-3 space-y-2'>
                      <Link
                        href='/profile'
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant='ghost'
                          size='sm'
                          className='w-full justify-start'
                        >
                          <User className='mr-2 h-4 w-4' />
                          Profile
                        </Button>
                      </Link>
                      <Button
                        variant='outline'
                        size='sm'
                        className='w-full justify-start'
                        onClick={handleSignOut}
                        disabled={loading}
                      >
                        <LogOut className='mr-2 h-4 w-4' />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className='space-y-2'>
                  <Link href='/login' onClick={() => setMobileMenuOpen(false)}>
                    <Button variant='ghost' className='w-full justify-start'>
                      Sign In
                    </Button>
                  </Link>
                  <Link
                    href='/register'
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className='w-full justify-start'>
                      Get Started
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
