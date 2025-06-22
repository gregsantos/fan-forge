"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { loginSchema } from "@/lib/validations"
import { useAuth } from "@/lib/contexts/auth"
import type { z } from "zod"

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [error, setError] = useState<string>("")
  const { signIn, loading, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // Redirect user after successful login
  useEffect(() => {
    if (user && !loading) {
      // Get redirect URL from query params or default based on role
      const redirectTo = searchParams.get('redirectTo')
      let redirectPath: string
      
      if (redirectTo) {
        // Decode the URL-encoded redirect path
        redirectPath = decodeURIComponent(redirectTo)
      } else {
        // Default redirect based on user role
        redirectPath = user.role === "creator" ? "/discover" : "/dashboard"
      }
      
      console.log('Redirecting user to:', redirectPath)
      router.replace(redirectPath)
    }
  }, [user, loading, router, searchParams])

  const onSubmit = async (data: LoginForm) => {
    try {
      setError("")
      await signIn(data)
      // The auth context will update with user info, 
      // and we'll redirect in a useEffect when user changes
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during login")
    }
  }

  // Show loading state while checking auth or redirecting
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {user ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In to FanForge</CardTitle>
          <p className="text-muted-foreground">
            Welcome back! Enter your credentials to continue.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                {...register("email")}
                error={errors.email?.message}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register("password")}
                error={errors.password?.message}
              />
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Forgot your password?
            </Link>
          </div>
          <div className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}