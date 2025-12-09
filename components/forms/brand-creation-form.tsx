"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building, Loader2 } from "lucide-react"
import { z } from "zod"

const brandSchema = z.object({
  name: z.string().min(1, "Brand name is required").max(100, "Brand name too long"),
  description: z.string().optional(),
})

interface BrandCreationFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function BrandCreationForm({ onSuccess, onCancel }: BrandCreationFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    try {
      // Validate form data
      const validatedData = brandSchema.parse(formData)

      // Create brand via API
      const response = await fetch('/api/auth/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create brand')
      }

      const result = await response.json()

      // Dispatch custom event for other components listening
      window.dispatchEvent(new CustomEvent('brandCreated', { 
        detail: result.brand 
      }))

      // Call success callback or redirect
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard')
      }
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        setErrors({ general: error instanceof Error ? error.message : 'An unexpected error occurred' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gradient-blue to-gradient-cyan">
          <Building className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl">Create Your Brand</CardTitle>
        <CardDescription>
          Set up your brand identity to start creating campaigns and organizing assets.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <div className="p-4 text-sm text-red-800 bg-red-50 dark:bg-red-950/20 dark:text-red-200 rounded-lg">
              {errors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Brand Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your brand name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={errors.name ? 'border-red-500' : ''}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Brand Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your brand and what makes it unique (optional)"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
              variant="gradient"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Brand...
                </>
              ) : (
                <>
                  <Building className="mr-2 h-4 w-4" />
                  Create Brand
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}