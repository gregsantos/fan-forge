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
import {authClient} from "@/lib/services/auth"
import {AnimatedBackground} from "@/components/shared/animated-background"
import {CheckCircle, AlertCircle} from "lucide-react"
import {z} from "zod"

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function ResetPasswordContent() {
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validToken, setValidToken] = useState<boolean | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    // Check if we have the required URL parameters for password reset
    const accessToken = searchParams.get("access_token")
    const refreshToken = searchParams.get("refresh_token")

    if (!accessToken || !refreshToken) {
      setValidToken(false)
      setError(
        "Invalid or missing reset token. Please request a new password reset link."
      )
    } else {
      setValidToken(true)
    }
  }, [searchParams])

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setError("")
      setLoading(true)
      await authClient.updatePassword(data.password)
      setSuccess(true)

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while updating your password"
      )
    } finally {
      setLoading(false)
    }
  }

  if (validToken === false) {
    return (
      <AnimatedBackground variant='default'>
        <div className='min-h-screen flex items-center justify-center px-4'>
          <Card className='w-full max-w-md bg-white/95 dark:bg-card/95 backdrop-blur-md border-white/20 dark:border-white/10 shadow-2xl'>
            <CardHeader className='text-center'>
              <div className='mx-auto w-16 h-16 bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center mb-4'>
                <AlertCircle className='w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 bg-clip-text text-transparent' />
              </div>
              <CardTitle className='text-2xl'>Invalid Reset Link</CardTitle>
              <p className='text-muted-foreground'>
                This password reset link is invalid or has expired.
              </p>
            </CardHeader>
            <CardContent className='text-center text-sm text-muted-foreground'>
              <p>Please request a new password reset link to continue.</p>
            </CardContent>
            <CardFooter className='flex flex-col space-y-2'>
              <Link href='/forgot-password' className='w-full'>
                <Button variant='gradient' className='w-full'>
                  Request New Reset Link
                </Button>
              </Link>
              <Link href='/login' className='w-full'>
                <Button variant='outline' className='w-full'>
                  Back to Sign In
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AnimatedBackground>
    )
  }

  if (success) {
    return (
      <AnimatedBackground variant='default'>
        <div className='min-h-screen flex items-center justify-center px-4'>
          <Card className='w-full max-w-md bg-white/95 dark:bg-card/95 backdrop-blur-md border-white/20 dark:border-white/10 shadow-2xl'>
            <CardHeader className='text-center'>
              <div className='mx-auto w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center mb-4'>
                <CheckCircle className='w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 bg-clip-text text-transparent' />
              </div>
              <CardTitle className='text-2xl'>Password Updated</CardTitle>
              <p className='text-muted-foreground'>
                Your password has been successfully updated.
              </p>
            </CardHeader>
            <CardContent className='text-center text-sm text-muted-foreground'>
              <p>
                You will be redirected to the sign in page in a few seconds.
              </p>
            </CardContent>
            <CardFooter>
              <Link href='/login' className='w-full'>
                <Button variant='gradient' className='w-full'>
                  Sign In Now
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AnimatedBackground>
    )
  }

  if (validToken === null) {
    return (
      <AnimatedBackground variant='default'>
        <div className='min-h-screen flex items-center justify-center px-4'>
          <Card className='w-full max-w-md bg-white/95 dark:bg-card/95 backdrop-blur-md border-white/20 dark:border-white/10 shadow-2xl'>
            <CardContent className='flex items-center justify-center py-8'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </CardContent>
          </Card>
        </div>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground variant='default'>
      <div className='min-h-screen flex items-center justify-center px-4'>
        <Card className='w-full max-w-md bg-white/95 dark:bg-card/95 backdrop-blur-md border-white/20 dark:border-white/10 shadow-2xl'>
          <CardHeader className='text-center'>
            <CardTitle className='text-2xl'>Set New Password</CardTitle>
            <p className='text-muted-foreground'>
              Enter your new password below.
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
                <label htmlFor='password' className='text-sm font-medium'>
                  New Password
                </label>
                <Input
                  id='password'
                  type='password'
                  placeholder='Enter your new password'
                  {...register("password")}
                  error={errors.password?.message}
                />
              </div>
              <div className='space-y-2'>
                <label
                  htmlFor='confirmPassword'
                  className='text-sm font-medium'
                >
                  Confirm New Password
                </label>
                <Input
                  id='confirmPassword'
                  type='password'
                  placeholder='Confirm your new password'
                  {...register("confirmPassword")}
                  error={errors.confirmPassword?.message}
                />
              </div>
              <Button
                type='submit'
                variant='gradient'
                className='w-full'
                loading={loading}
              >
                Update Password
              </Button>
            </form>
          </CardContent>
          <CardFooter className='flex flex-col space-y-4'>
            <div className='text-center text-sm text-muted-foreground'>
              Remember your password?{" "}
              <Link
                href='/login'
                className='text-primary hover:underline font-medium'
              >
                Sign in
              </Link>
            </div>
            <div className='text-center text-sm text-muted-foreground border-t pt-4'>
              <Link
                href='/'
                className='text-muted-foreground hover:text-primary transition-colors'
              >
                ← Back to FanForge
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AnimatedBackground>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AnimatedBackground variant='default'>
          <div className='min-h-screen flex items-center justify-center px-4'>
            <Card className='w-full max-w-md bg-white/95 dark:bg-card/95 backdrop-blur-md border-white/20 dark:border-white/10 shadow-2xl'>
              <CardContent className='flex items-center justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              </CardContent>
            </Card>
          </div>
        </AnimatedBackground>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
