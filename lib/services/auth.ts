import {createClient} from "@/utils/supabase/client"
import type {User} from "@/types"

export interface AuthUser {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
  role?: string
  emailVerified: boolean
}

export interface RegisterData {
  email: string
  password: string
  displayName: string
  role: "creator" | "brand_admin"
}

export interface SignUpResult {
  success: boolean
  needsEmailConfirmation: boolean
  email: string
  message: string
}

export interface LoginData {
  email: string
  password: string
}

// Enhanced cache for user data with validation tracking
let userCache: {
  user: AuthUser | null
  timestamp: number
  validated: boolean // Track if this was validated via getUser()
} | null = null
const CACHE_DURATION = 30 * 1000 // 30 seconds
const VALIDATION_INTERVAL = 2 * 60 * 1000 // Re-validate every 2 minutes

// Client-side auth functions
export const authClient = {
  async signUp(data: RegisterData): Promise<SignUpResult> {
    const supabase = createClient()

    const {data: authData, error: authError} = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          display_name: data.displayName,
          role: data.role,
        },
        emailRedirectTo: `${window.location.origin}/confirm`,
      },
    })

    if (authError) throw authError

    // Clear cache on signup
    userCache = null

    // Check if user is immediately logged in or needs email confirmation
    const needsEmailConfirmation = Boolean(
      !authData.session && authData.user && !authData.user.email_confirmed_at
    )

    return {
      success: true,
      needsEmailConfirmation: needsEmailConfirmation,
      email: data.email,
      message: needsEmailConfirmation
        ? "Please check your email to confirm your account"
        : "Account created successfully",
    }
  },

  async resendConfirmation(email: string): Promise<void> {
    const supabase = createClient()

    const {error} = await supabase.auth.resend({
      type: "signup",
      email: email,
    })

    if (error) throw error
  },

  async signIn(data: LoginData) {
    const supabase = createClient()

    const {data: authData, error} = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) throw error

    // Clear cache on signin
    userCache = null

    return authData
  },

  async signOut() {
    const supabase = createClient()

    // Clear cache before signout
    userCache = null

    const {error} = await supabase.auth.signOut()
    if (error) throw error
  },

  async getCurrentUser(
    forceRefresh = false,
    requireValidation = false
  ): Promise<AuthUser | null> {
    const supabase = createClient()

    try {
      const now = Date.now()

      // Check cache first (unless force refresh or validation required)
      if (!forceRefresh && userCache && !requireValidation) {
        if (now - userCache.timestamp < CACHE_DURATION) {
          // If validation is stale, refresh in background but return cached data
          if (
            !userCache.validated ||
            now - userCache.timestamp > VALIDATION_INTERVAL
          ) {
            // Background validation - don't await
            this.validateUserInBackground()
          }
          return userCache.user
        }
      }

      // For security-critical operations or when cache is stale, use getUser()
      const {
        data: {user},
        error,
      } = await supabase.auth.getUser()

      if (error) {
        console.error("User validation error:", error)
        userCache = {user: null, timestamp: now, validated: true}
        return null
      }

      if (!user) {
        userCache = {user: null, timestamp: now, validated: true}
        return null
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email!,
        displayName: user.user_metadata?.display_name,
        avatarUrl: user.user_metadata?.avatar_url,
        role: user.user_metadata?.role,
        emailVerified: user.email_confirmed_at !== null,
      }

      // Cache the validated result
      userCache = {user: authUser, timestamp: now, validated: true}

      return authUser
    } catch (error) {
      console.error("Error fetching current user:", error)
      const now = Date.now()
      userCache = {user: null, timestamp: now, validated: true}
      return null
    }
  },

  // Fast UI state check - uses session for speed but marks as unvalidated
  async getCurrentUserFast(): Promise<AuthUser | null> {
    const supabase = createClient()

    try {
      const now = Date.now()

      // Check validated cache first
      if (
        userCache &&
        userCache.validated &&
        now - userCache.timestamp < CACHE_DURATION
      ) {
        return userCache.user
      }

      // Use getSession for fast UI updates (but don't trust for security decisions)
      const {
        data: {session},
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error("Session error:", error)
        return userCache?.user || null
      }

      if (!session?.user) {
        return null
      }

      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        displayName: session.user.user_metadata?.display_name,
        avatarUrl: session.user.user_metadata?.avatar_url,
        role: session.user.user_metadata?.role,
        emailVerified: session.user.email_confirmed_at !== null,
      }

      // Cache as unvalidated for UI purposes only
      userCache = {user: authUser, timestamp: now, validated: false}

      // Validate in background for security
      this.validateUserInBackground()

      return authUser
    } catch (error) {
      console.error("Error fetching session:", error)
      return userCache?.user || null
    }
  },

  // Background validation to keep security up to date
  async validateUserInBackground(): Promise<void> {
    try {
      // Don't await - let this run in background
      setTimeout(async () => {
        await this.getCurrentUser(true, true)
      }, 100)
    } catch (error) {
      console.error("Background validation error:", error)
    }
  },

  async updateProfile(
    updates: Partial<
      Pick<User, "displayName" | "avatarUrl" | "bio" | "socialLinks">
    >
  ) {
    // Clear cache before profile update
    userCache = null

    // Profile updates should be handled via API routes
    // that run on the server-side
    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error("Failed to update profile")
    }
  },

  async resetPassword(email: string) {
    const supabase = createClient()

    const {error} = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) throw error
  },

  async updatePassword(newPassword: string) {
    const supabase = createClient()

    const {error} = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error
  },

  // Clear user cache manually
  clearCache() {
    userCache = null
  },
}

// Auth state change listeners for client-side
export const authListeners = {
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const supabase = createClient()

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Clear cache on auth state change
      userCache = null

      if (session?.user) {
        // For auth state changes, we can trust the session since it's from the auth event
        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          displayName: session.user.user_metadata?.display_name,
          avatarUrl: session.user.user_metadata?.avatar_url,
          role: session.user.user_metadata?.role,
          emailVerified: session.user.email_confirmed_at !== null,
        }

        // Cache as validated since it comes from auth event
        const now = Date.now()
        userCache = {user, timestamp: now, validated: true}

        callback(user)
      } else {
        callback(null)
      }
    })

    return () => subscription.unsubscribe()
  },
}
