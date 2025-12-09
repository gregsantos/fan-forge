"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import { Building, Loader2 } from "lucide-react"
import { z } from "zod"

const createBrandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(100, "Brand name too long"),
  description: z.string().optional(),
})

type CreateBrandForm = z.infer<typeof createBrandSchema>

export default function CreateFirstBrandClient() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBrandForm>({
    resolver: zodResolver(createBrandSchema),
  })

  const onSubmit = async (data: CreateBrandForm) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create brand")
      }

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('brandCreated'))
      
      // Refresh the page to show the new brand and IP kits
      router.refresh()
    } catch (err) {
      console.error("Brand creation error:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create brand. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-md mx-auto">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Create Your Brand</CardTitle>
            <CardDescription>
              Welcome! As a brand administrator, you need to create your brand first to manage IP kits and campaigns.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Brand Name *
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your brand name"
                  {...register("name")}
                  disabled={loading}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Textarea
                  id="description"
                  placeholder="Briefly describe your brand"
                  rows={3}
                  {...register("description")}
                  disabled={loading}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Brand
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                After creating your brand, you&apos;ll be able to:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                <li>• Create and manage IP kits</li>
                <li>• Launch creative campaigns</li>
                <li>• Review creator submissions</li>
                <li>• Upload brand assets</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}