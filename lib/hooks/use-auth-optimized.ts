"use client"

import {useState, useEffect, useCallback} from "react"
import {useRouter} from "next/navigation"
import {
  authClient,
  type AuthUser,
  type LoginData,
  type RegisterData,
} from "@/lib/services/auth"

interface UseAuthOptions {
  redirectOnLogin?: boolean
  redirectOnLogout?: boolean
  fastMode?: boolean // Use fast session-based checks for UI only
}

export function useAuthOptimized(options: UseAuthOptions = {}) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const {
    redirectOnLogin = true,
    redirectOnLogout = true,
    fastMode = false,
  } = options

  // Initialize auth state
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        // Use appropriate method based on fastMode setting
        const currentUser = fastMode
          ? await authClient.getCurrentUserFast()
          : await authClient.getCurrentUser()

        if (isMounted) {
          setUser(currentUser)
          setLoading(false)
        }
      } catch (err) {
        console.error("Auth initialization error:", err)
        if (isMounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      isMounted = false
    }
  }, [fastMode])

  const signIn = useCallback(
    async (data: LoginData) => {
      try {
        setLoading(true)
        setError(null)

        await authClient.signIn(data)
        const newUser = await authClient.getCurrentUser(true) // Force refresh with validation

        setUser(newUser)
        setLoading(false)

        // Note: Redirect handling is done by middleware, not here
        // This prevents race conditions between client and server redirects
      } catch (err) {
        setError(err instanceof Error ? err.message : "Login failed")
        setLoading(false)
        throw err
      }
    },
    []
  )

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      await authClient.signOut()
      authClient.clearCache()

      setUser(null)

      if (redirectOnLogout) {
        router.push("/")
      }

      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed")
      setLoading(false)
      throw err
    }
  }, [router, redirectOnLogout])

  const signUp = useCallback(
    async (data: RegisterData) => {
      try {
        setLoading(true)
        setError(null)

        const result = await authClient.signUp(data)

        if (!result.needsEmailConfirmation) {
          const newUser = await authClient.getCurrentUser(true)
          setUser(newUser)
          // Note: Redirect handling is done by middleware, not here
        }

        setLoading(false)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : "Registration failed")
        setLoading(false)
        throw err
      }
    },
    []
  )

  const refreshUser = useCallback(async () => {
    try {
      const refreshedUser = await authClient.getCurrentUser(true) // Always validate on manual refresh
      setUser(refreshedUser)
      return refreshedUser
    } catch (err) {
      console.error("Error refreshing user:", err)
      setUser(null)
      return null
    }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      setError(null)
      await authClient.resetPassword(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed")
      throw err
    }
  }, [])

  const resendConfirmation = useCallback(async (email: string) => {
    try {
      setError(null)
      await authClient.resendConfirmation(email)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to resend confirmation"
      )
      throw err
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    signUp,
    refreshUser,
    resetPassword,
    resendConfirmation,
    clearError,
    isAuthenticated: !!user,
    isBrandAdmin: user?.role === "brand_admin",
    isCreator: user?.role === "creator",
  }
}
