"use client"

import {useEffect, useState} from "react"
import {useRouter} from "next/navigation"
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {CheckCircle, XCircle, Loader2} from "lucide-react"
import {useAuthOptimized} from "@/lib/hooks/use-auth-optimized"
import {createClient} from "@/utils/supabase/client"

export default function ConfirmPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  )
  const [message, setMessage] = useState("")
  const [params, setParams] = useState<{
    token_hash: string | null
    type: string | null
  }>({token_hash: null, type: null})
  const router = useRouter()
  const {user} = useAuthOptimized({redirectOnLogin: false})

  useEffect(() => {
    // Extract parameters client-side to avoid Suspense issues during build
    const searchParams = new URLSearchParams(window.location.search)
    const token_hash = searchParams.get("token") || searchParams.get("code")
    const type = searchParams.get("type") || "signup"
    setParams({token_hash, type})
    console.log("Confirmation URL Parameters:", {
      token_hash,
      type,
      fullUrl: window.location.href,
    })
  }, [])

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const supabase = createClient()

        // Wait for auth state to resolve
        console.log("Waiting for auth state to resolve...")
        const {
          data: {user},
          error,
        } = await supabase.auth.getUser()
        console.log("Auth state resolved:", {user, error})

        if (user) {
          console.log("User already logged in:", user)

          // Even if user is logged in, we still need to ensure their profile exists in our database
          console.log(
            "📧 User is authenticated, ensuring database profile exists..."
          )

          try {
            const response = await fetch("/api/auth/create-profile", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: user.id,
                email: user.email,
                displayName: user.user_metadata?.display_name,
                role: user.user_metadata?.role,
              }),
            })

            const result = await response.json()
            console.log("📧 Profile creation result:", {
              status: response.status,
              result,
            })

            if (response.ok) {
              console.log("✅ User profile ensured in database")
              setStatus("success")
              setMessage(
                "Email confirmed and profile created! Welcome to FanForge."
              )
            } else {
              console.error("❌ Failed to create user profile:", result)
              setStatus("success") // Still success for auth, but note the issue
              setMessage(
                "Email confirmed but profile setup incomplete. Please contact support."
              )
            }
          } catch (profileError) {
            console.error("❌ Error ensuring user profile:", profileError)
            setStatus("success") // Still success for auth
            setMessage(
              "Email confirmed but profile setup incomplete. Please contact support."
            )
          }

          return
        }

        if (params.token_hash && params.type) {
          const {error, data} = await supabase.auth.verifyOtp({
            token_hash: params.token_hash,
            type: params.type as any,
          })

          console.log("Supabase verifyOtp response:", {error, data})

          if (error) {
            console.error("Email confirmation error:", error)
            setStatus("error")
            setMessage(error.message || "Failed to confirm email")
          } else {
            setStatus("success")
            setMessage("Email confirmed successfully!")

            // Create user profile in our database after successful confirmation
            console.log("📧 Attempting to create user profile in database...", {
              userId: data.user?.id,
              email: data.user?.email,
              displayName: data.user?.user_metadata?.display_name,
              role: data.user?.user_metadata?.role,
            })

            try {
              const response = await fetch("/api/auth/create-profile", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId: data.user?.id,
                  email: data.user?.email,
                  displayName: data.user?.user_metadata?.display_name,
                  role: data.user?.user_metadata?.role,
                }),
              })

              const result = await response.json()
              console.log("📧 Create profile response:", {
                status: response.status,
                result,
              })

              if (response.ok) {
                console.log("✅ User profile created in database successfully")
              } else {
                console.error("❌ Failed to create user profile:", result)
                setMessage(
                  "Email confirmed but profile creation failed. Please contact support."
                )
              }
            } catch (profileError) {
              console.error("❌ Error creating user profile:", profileError)
              setMessage(
                "Email confirmed but profile creation failed. Please contact support."
              )
            }

            // Wait a moment for auth state to update, then redirect
            setTimeout(() => {
              // Will redirect based on user role via auth state change
            }, 2000)
          }
        } else {
          setStatus("error")
          setMessage("Invalid confirmation link")
        }
      } catch (error) {
        console.error("Confirmation error:", error)
        setStatus("error")
        setMessage("An error occurred while confirming your email")
      }
    }

    if (params.token_hash !== null) {
      handleEmailConfirmation()
    }
  }, [params])

  // Handle redirect after successful confirmation
  useEffect(() => {
    if (status === "success" && user) {
      const redirectPath = user.role === "creator" ? "/discover" : "/dashboard"
      setTimeout(() => {
        router.push(redirectPath)
      }, 1500)
    }
  }, [status, user, router])

  return (
    <div className='min-h-screen flex items-center justify-center bg-muted/30 px-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full'>
            {status === "loading" && (
              <div className='bg-blue-100 dark:bg-blue-900/20 rounded-full h-12 w-12 flex items-center justify-center'>
                <Loader2 className='h-6 w-6 text-blue-600 animate-spin' />
              </div>
            )}
            {status === "success" && (
              <div className='bg-green-100 dark:bg-green-900/20 rounded-full h-12 w-12 flex items-center justify-center'>
                <CheckCircle className='h-6 w-6 text-green-600' />
              </div>
            )}
            {status === "error" && (
              <div className='bg-red-100 dark:bg-red-900/20 rounded-full h-12 w-12 flex items-center justify-center'>
                <XCircle className='h-6 w-6 text-red-600' />
              </div>
            )}
          </div>
          <CardTitle className='text-2xl'>
            {status === "loading" && "Confirming Email..."}
            {status === "success" && "Email Confirmed!"}
            {status === "error" && "Confirmation Failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className='text-center space-y-4'>
          <p className='text-muted-foreground'>{message}</p>

          {status === "success" && user && (
            <div className='space-y-2'>
              <p className='text-sm text-green-600 dark:text-green-400'>
                Welcome to FanForge! Redirecting you to your{" "}
                {user.role === "creator" ? "discovery" : "dashboard"} page...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className='space-y-3'>
              <Button
                onClick={() => router.push("/register")}
                className='w-full'
              >
                Try Registration Again
              </Button>
              <Button
                variant='outline'
                onClick={() => router.push("/login")}
                className='w-full'
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === "loading" && (
            <p className='text-sm text-muted-foreground'>
              Please wait while we verify your email...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
