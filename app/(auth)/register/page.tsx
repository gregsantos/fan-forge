"use client"

import {useState, useEffect} from "react"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import {useRouter} from "next/navigation"
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
import {Badge} from "@/components/ui/badge"
import {registerSchema} from "@/lib/validations"
import {useAuth} from "@/lib/contexts/auth"
import {AnimatedBackground} from "@/components/shared/animated-background"
import {Palette, BarChart3, Mail, RefreshCw, ArrowLeft} from "lucide-react"
import type {z} from "zod"

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [error, setError] = useState<string>("")
  const [emailConfirmationState, setEmailConfirmationState] = useState<{
    needed: boolean
    email: string
    message: string
  } | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const {signUp, loading, user, resendConfirmation} = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    formState: {errors},
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const selectedRole = watch("role")

  // Redirect user based on role after successful registration (only if immediately logged in)
  useEffect(() => {
    if (user && !loading && !emailConfirmationState?.needed) {
      const redirectPath = user.role === "creator" ? "/discover" : "/dashboard"
      router.push(redirectPath)
    }
  }, [user, loading, router, emailConfirmationState])

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError("")
      const result = await signUp({
        email: data.email,
        password: data.password,
        displayName: data.name,
        role: data.role,
      })

      if (result.needsEmailConfirmation) {
        setEmailConfirmationState({
          needed: true,
          email: result.email,
          message: result.message,
        })
      }
      // If no email confirmation needed, user will be logged in and redirected via useEffect
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred during registration"
      )
    }
  }

  const handleResendEmail = async () => {
    if (!emailConfirmationState?.email) return

    try {
      setResendLoading(true)
      setError("")
      await resendConfirmation(emailConfirmationState.email)
      setEmailConfirmationState(prev =>
        prev
          ? {
              ...prev,
              message: "Confirmation email sent! Please check your inbox.",
            }
          : null
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend confirmation email"
      )
    } finally {
      setResendLoading(false)
    }
  }

  // Show email confirmation screen if needed
  if (emailConfirmationState?.needed) {
    return (
      <AnimatedBackground variant='default'>
        <div className='min-h-screen flex items-center justify-center px-4 py-8'>
          <Card className='w-full max-w-md bg-white/95 dark:bg-card/95 backdrop-blur-md border-white/20 dark:border-white/10 shadow-2xl'>
            <CardHeader className='text-center'>
              <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
                <Mail className='h-6 w-6 text-primary' />
              </div>
              <CardTitle className='text-2xl'>Check Your Email</CardTitle>
              <p className='text-muted-foreground'>
                We&apos;ve sent a confirmation link to{" "}
                <span className='font-medium text-foreground'>
                  {emailConfirmationState.email}
                </span>
              </p>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 text-center'>
                <p className='text-sm text-blue-800 dark:text-blue-200'>
                  {emailConfirmationState.message}
                </p>
              </div>

              <div className='space-y-3 text-sm text-muted-foreground'>
                <p>• Click the confirmation link in your email</p>
                <p>• You&apos;ll be automatically redirected back here</p>
                <p>• Check your spam folder if you don&apos;t see the email</p>
              </div>

              {error && (
                <div className='p-3 bg-destructive/10 border border-destructive/20 rounded-md'>
                  <p className='text-sm text-destructive'>{error}</p>
                </div>
              )}

              <div className='flex gap-3'>
                <Button
                  variant='outline'
                  onClick={handleResendEmail}
                  disabled={resendLoading}
                  className='flex-1'
                >
                  {resendLoading ? (
                    <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                  ) : (
                    <Mail className='h-4 w-4 mr-2' />
                  )}
                  Resend Email
                </Button>
                <Button
                  variant='ghost'
                  onClick={() => setEmailConfirmationState(null)}
                  className='flex-1'
                >
                  <ArrowLeft className='h-4 w-4 mr-2' />
                  Back to Form
                </Button>
              </div>
            </CardContent>
            <CardFooter className='text-center'>
              <div className='text-sm text-muted-foreground'>
                Wrong email?{" "}
                <button
                  onClick={() => setEmailConfirmationState(null)}
                  className='text-primary hover:underline font-medium'
                >
                  Try again
                </button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </AnimatedBackground>
    )
  }

  return (
    <AnimatedBackground variant='default'>
      <div className='min-h-screen flex items-center justify-center px-4 py-8'>
        <Card className='w-full max-w-md bg-white/95 dark:bg-card/95 backdrop-blur-md border-white/20 dark:border-white/10 shadow-2xl'>
          <CardHeader className='text-center'>
            <CardTitle className='text-2xl'>Join FanForge</CardTitle>
            <p className='text-muted-foreground'>
              Create your account and start your creative journey.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
              {error && (
                <div className='p-4 bg-destructive/10 border border-destructive/20 rounded-md'>
                  <p className='text-sm text-destructive'>{error}</p>
                </div>
              )}
              <div className='space-y-2'>
                <label htmlFor='name' className='text-sm font-medium'>
                  Full name
                </label>
                <Input
                  id='name'
                  type='text'
                  placeholder='Enter your full name'
                  {...register("name")}
                  error={errors.name?.message}
                />
              </div>

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
                  placeholder='Create a secure password'
                  {...register("password")}
                  error={errors.password?.message}
                />
              </div>

              <div className='space-y-2'>
                <label
                  htmlFor='confirmPassword'
                  className='text-sm font-medium'
                >
                  Confirm password
                </label>
                <Input
                  id='confirmPassword'
                  type='password'
                  placeholder='Confirm your password'
                  {...register("confirmPassword")}
                  error={errors.confirmPassword?.message}
                />
              </div>

              <div className='space-y-3'>
                <label className='text-sm font-medium'>I am a...</label>
                <div className='grid grid-cols-1 gap-3'>
                  <label className='relative cursor-pointer'>
                    <input
                      type='radio'
                      value='creator'
                      {...register("role")}
                      className='sr-only'
                    />
                    <div
                      className={`
                    p-4 border rounded-lg transition-all hover:border-primary
                    ${selectedRole === "creator" ? "border-primary bg-primary/5" : "border-border"}
                  `}
                    >
                      <div className='flex items-center space-x-3'>
                        <Palette className='h-5 w-5 text-primary' />
                        <div>
                          <div className='font-medium'>Creator</div>
                          <div className='text-sm text-muted-foreground'>
                            Create artwork using official brand assets
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>

                  <label className='relative cursor-pointer'>
                    <input
                      type='radio'
                      value='brand_admin'
                      {...register("role")}
                      className='sr-only'
                    />
                    <div
                      className={`
                    p-4 border rounded-lg transition-all hover:border-primary
                    ${selectedRole === "brand_admin" ? "border-primary bg-primary/5" : "border-border"}
                  `}
                    >
                      <div className='flex items-center space-x-3'>
                        <BarChart3 className='h-5 w-5 text-primary' />
                        <div>
                          <div className='font-medium'>Brand Administrator</div>
                          <div className='text-sm text-muted-foreground'>
                            Create campaigns and manage creator submissions
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
                {errors.role && (
                  <p className='text-sm text-destructive'>
                    {errors.role.message}
                  </p>
                )}
              </div>

              <div className='space-y-4'>
                <div className='flex items-center space-x-2 text-xs text-muted-foreground'>
                  <input
                    type='checkbox'
                    required
                    className='h-4 w-4 rounded border-border'
                  />
                  <span>
                    I agree to the{" "}
                    <Link
                      href='/terms'
                      className='text-primary hover:underline'
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      href='/privacy'
                      className='text-primary hover:underline'
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </div>

                <Button
                  type='submit'
                  variant='gradient'
                  className='w-full'
                  loading={loading}
                >
                  Create Account
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className='flex flex-col space-y-4'>
            <div className='text-center text-sm text-muted-foreground'>
              Already have an account?{" "}
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
