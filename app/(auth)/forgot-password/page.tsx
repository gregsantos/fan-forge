"use client"

import {useState} from "react"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
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
import {useAuth} from "@/lib/contexts/auth"
import {ArrowLeft, CheckCircle} from "lucide-react"
import {z} from "zod"

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const {resetPassword} = useAuth()

  const {
    register,
    handleSubmit,
    formState: {errors},
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setError("")
      setLoading(true)
      await resetPassword(data.email)
      setSuccess(true)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while sending reset email"
      )
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-muted/30 px-4'>
        <Card className='w-full max-w-md'>
          <CardHeader className='text-center'>
            <div className='mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4'>
              <CheckCircle className='w-8 h-8 text-green-600' />
            </div>
            <CardTitle className='text-2xl'>Check Your Email</CardTitle>
            <p className='text-muted-foreground'>
              We&apos;ve sent a password reset link to your email address.
            </p>
          </CardHeader>
          <CardContent className='text-center text-sm text-muted-foreground'>
            <p>
              Click the link in the email to reset your password. If you
              don&apos;t see the email, check your spam folder.
            </p>
          </CardContent>
          <CardFooter className='flex flex-col space-y-4'>
            <Link href='/login' className='w-full'>
              <Button variant='outline' className='w-full'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-muted/30 px-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl'>Reset Your Password</CardTitle>
          <p className='text-muted-foreground'>
            Enter your email address and we&apos;ll send you a link to reset
            your password.
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
            <Button type='submit' className='w-full' loading={loading}>
              Send Reset Link
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
        </CardFooter>
      </Card>
    </div>
  )
}
