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
  signUp: (data: RegisterData) => Promise<SignUpResult>
  signIn: (data: LoginData) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<AuthUser>) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendConfirmation: (email: string) => Promise<void>
  refreshUser: () => Promise<AuthUser | null>
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
    try {
      await authClient.signIn(data)

      // Immediately refresh user state for faster UX
      const newUser = await refreshUser()

      // Trigger immediate redirect based on user role
      if (newUser) {
        const userRole = newUser.role
        if (userRole === "brand_admin") {
          router.push("/dashboard")
        } else if (userRole === "creator") {
          router.push("/discover")
        } else {
          router.push("/discover") // Default fallback
        }
      }

      setLoading(false)
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await authClient.signOut()
      setUser(null)
      router.push("/")
      setLoading(false)
    } catch (error) {
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
    try {
      await authClient.resendConfirmation(email)
    } catch (error) {
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    isClient,
    signUp,
    signIn,
    signOut,
    updateProfile,
    resetPassword,
    resendConfirmation,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
