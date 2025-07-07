"use client"

import {useState, useEffect, Suspense} from "react"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import {useRouter, useSearchParams} from "next/navigation"
import Link from "next/link"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {loginSchema} from "@/lib/validations"
import {useAuth} from "@/lib/contexts/auth"
import {AnimatedBackground} from "@/components/shared/animated-background"
import type {z} from "zod"

type LoginForm = z.infer<typeof loginSchema>

function LoginForm() {
  const [isRedirecting, setIsRedirecting] = useState(false)
  const {signIn, loading, error, clearError} = useAuth()

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      clearError()
      setIsRedirecting(true)
      await signIn(data)
      // signIn handles redirect, so we only get here if it fails
    } catch (err) {
      setIsRedirecting(false)
      // Error is handled by auth context
    }
  }

  // Show loading state while authenticating or redirecting
  if (loading || isRedirecting) {
    return (
      <AnimatedBackground variant="default">
        <div className='min-h-screen flex items-center justify-center px-4'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
            <p className='text-white/80'>
              {isRedirecting ? "Signing in..." : "Loading..."}
            </p>
          </div>
        </div>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground variant="default">
      <div className='min-h-screen flex items-center justify-center px-4'>
        <Card className='w-full max-w-md bg-white/95 dark:bg-card/95 backdrop-blur-md border-white/20 dark:border-white/10 shadow-2xl'>
          <CardHeader className='text-center'>
            <CardTitle className='text-2xl'>Sign In to FanForge</CardTitle>
            <p className='text-muted-foreground'>
              Welcome back! Enter your credentials to continue.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              {error && (
                <div className='p-4 bg-destructive/10 border border-destructive/20 rounded-md'>
                  <p className='text-sm text-destructive'>{error}</p>
                </div>
              )}
              <div className='space-y-2'>
                <label htmlFor='email' className='text-sm font-medium'>
                  Email address
                </label>
                <Input
                  id='email'
                  type='email'
                  placeholder='Enter your email address'
                  {...register("email")}
                  error={errors.email?.message}
                />
              </div>
              <div className='space-y-2'>
                <label htmlFor='password' className='text-sm font-medium'>
                  Password
                </label>
                <Input
                  id='password'
                  type='password'
                  placeholder='Enter your password'
                  {...register("password")}
                  error={errors.password?.message}
                />
              </div>
              <Button type='submit' variant="gradient" className='w-full' loading={loading}>
                Sign In
              </Button>
            </form>
          </CardContent>
          <CardFooter className='flex flex-col space-y-4'>
            <div className='text-center text-sm text-muted-foreground'>
              <Link
                href='/forgot-password'
                className='text-primary hover:underline'
              >
                Forgot your password?
              </Link>
            </div>
            <div className='text-center text-sm text-muted-foreground'>
              Don&apos;t have an account?{" "}
              <Link
                href='/register'
                className='text-primary hover:underline font-medium'
              >
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AnimatedBackground>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AnimatedBackground variant="default">
          <div className='min-h-screen flex items-center justify-center px-4'>
            <div className='text-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4'></div>
              <p className='text-white/80'>Loading...</p>
            </div>
          </div>
        </AnimatedBackground>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
