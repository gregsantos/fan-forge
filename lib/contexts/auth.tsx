"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"
import {useRouter} from "next/navigation"
import {
  authClient,
  authListeners,
  type AuthUser,
  type RegisterData,
  type LoginData,
  type SignUpResult,
} from "@/lib/services/auth"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isClient: boolean
  error: string | null
  signUp: (data: RegisterData) => Promise<SignUpResult>
  signIn: (data: LoginData) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<AuthUser>) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendConfirmation: (email: string) => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
  clearError: () => void
  isAuthenticated: boolean
  isBrandAdmin: boolean
  isCreator: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({children}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [authInitialized, setAuthInitialized] = useState(false)
  const router = useRouter()

  // Memoized user refresh function
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authClient.getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch (error) {
      console.error("Error refreshing user:", error)
      setUser(null)
      return null
    }
  }, [])

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        setIsClient(true)

        // Get initial user state immediately
        const currentUser = await authClient.getCurrentUser()

        if (isMounted) {
          setUser(currentUser)
          setLoading(false)
          setAuthInitialized(true)
        }
      } catch (error) {
        console.error("Auth initialization error:", error)
        if (isMounted) {
          setUser(null)
          setLoading(false)
          setAuthInitialized(true)
        }
      }
    }

    initializeAuth()

    return () => {
      isMounted = false
    }
  }, [])

  // Set up auth state listener after initialization
  useEffect(() => {
    if (!authInitialized) return

    const unsubscribe = authListeners.onAuthStateChange(newUser => {
      setUser(newUser)

      // Only set loading to false if we haven't done so already
      if (loading) {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [authInitialized, loading])

  const signUp = async (data: RegisterData): Promise<SignUpResult> => {
    setLoading(true)
    try {
      const result = await authClient.signUp(data)

      if (!result.needsEmailConfirmation) {
        // Refresh user immediately for instant login
        await refreshUser()
      }

      setLoading(false)
      return result
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signIn = async (data: LoginData) => {
    setLoading(true)
    setError(null)
    try {
      // Use API route for server-side login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Login failed')
      }

      // Refresh user state
      await refreshUser()
      
      // Let middleware handle all redirects by forcing page reload
      // This ensures consistent redirect behavior across the app
      setTimeout(() => {
        window.location.reload()
      }, 100)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      setLoading(false)
      throw err
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      // Clear client-side state immediately for responsive UI
      setUser(null)
      authClient.clearCache()

      // Use API route for server-side logout (consistent with useAuthOptimized)
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Logout failed')
      }

      // Also call client-side signOut to ensure Supabase state is cleared
      await authClient.signOut()
      
      // Navigate to home and refresh to ensure clean state
      router.push("/")
      router.refresh()
      
      setLoading(false)
    } catch (error) {
      // If logout fails, we still want to clear local state for security
      setUser(null)
      authClient.clearCache()
      setLoading(false)
      throw error
    }
  }

  const updateProfile = async (data: Partial<AuthUser>) => {
    if (!user) throw new Error("No user logged in")

    try {
      await authClient.updateProfile(data)
      await refreshUser() // Refresh user data
    } catch (error) {
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      await authClient.resetPassword(email)
    } catch (error) {
      throw error
    }
  }

  const resendConfirmation = async (email: string) => {
    setError(null)
    try {
      await authClient.resendConfirmation(email)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend confirmation'
      setError(errorMessage)
      throw err
    }
  }

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    error,
    isClient,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    resendConfirmation,
    refreshUser,
    clearError,
    isAuthenticated: !!user,
    isBrandAdmin: user?.role === "brand_admin",
    isCreator: user?.role === "creator",
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
