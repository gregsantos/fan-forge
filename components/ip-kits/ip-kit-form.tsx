"use client"

import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Save, Eye, Upload, AlertCircle, CheckCircle } from "lucide-react"
import { z } from "zod"

// Form validation schema
const ipKitFormSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  description: z.string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  guidelines: z.string()
    .max(2000, "Guidelines must be less than 2000 characters")
    .optional(),
  isPublished: z.boolean().default(false)
})

type IpKitFormData = z.infer<typeof ipKitFormSchema>

interface IpKit {
  id: string
  name: string
  description?: string
  guidelines?: string
  brandId: string
  isPublished: boolean
  version: number
  createdAt: string
  updatedAt: string
  assetCount?: number
}

interface IpKitFormProps {
  ipKit?: IpKit
  brandId: string
  onSave: (data: IpKitFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  className?: string
}

export function IpKitForm({
  ipKit,
  brandId,
  onSave,
  onCancel,
  isLoading = false,
  className
}: IpKitFormProps) {
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty, isValid }
  } = useForm<IpKitFormData>({
    resolver: zodResolver(ipKitFormSchema),
    defaultValues: {
      name: ipKit?.name || "",
      description: ipKit?.description || "",
      guidelines: ipKit?.guidelines || "",
      isPublished: ipKit?.isPublished || false
    }
  })

  const watchedIsPublished = watch("isPublished")

  const onSubmit = async (data: IpKitFormData) => {
    try {
      await onSave(data)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Save error:', error)
    }
  }

  // Auto-save every 30 seconds if there are changes
  React.useEffect(() => {
    const handleAutoSave = async () => {
      if (!isDirty || !isValid) return

      try {
        setAutoSaving(true)
        const formData = watch()
        await onSave(formData)
        setLastSaved(new Date())
      } catch (error) {
        console.error('Auto-save error:', error)
      } finally {
        setAutoSaving(false)
      }
    }

    if (!isDirty) return

    const interval = setInterval(handleAutoSave, 30000)
    return () => clearInterval(interval)
  }, [isDirty, isValid, watch, onSave])

  const getStatusBadge = () => {
    if (ipKit?.isPublished) {
      return <Badge variant="default" className="bg-green-600">Published v{ipKit.version}</Badge>
    } else {
      return <Badge variant="secondary">Draft</Badge>
    }
  }

  const formatLastSaved = () => {
    if (!lastSaved) return null
    return `Last saved: ${lastSaved.toLocaleTimeString()}`
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">
              {ipKit ? 'Edit IP Kit' : 'Create New IP Kit'}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              {ipKit && getStatusBadge()}
              {autoSaving && (
                <div className="flex items-center space-x-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                  <span>Auto-saving...</span>
                </div>
              )}
              {lastSaved && !autoSaving && (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>{formatLastSaved()}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" variant="gradient" disabled={isLoading || !isDirty}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Basic Information */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Define the core details of your IP kit that creators will see.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter IP kit name..."
                {...register("name")}
                error={errors.name?.message}
              />
              <p className="text-xs text-muted-foreground">
                A clear, descriptive name that creators will recognize
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your IP kit and what it contains..."
                rows={3}
                {...register("description")}
                error={errors.description?.message}
              />
              <p className="text-xs text-muted-foreground">
                Help creators understand what this IP kit is about (optional)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Guidelines & Rules */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30">
          <CardHeader>
            <CardTitle>Creative Guidelines</CardTitle>
            <CardDescription>
              Set clear expectations for how creators should use your assets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guidelines">Usage Guidelines</Label>
              <Textarea
                id="guidelines"
                placeholder="Provide guidelines for asset usage, style requirements, dos and don'ts..."
                rows={6}
                {...register("guidelines")}
                error={errors.guidelines?.message}
              />
              <p className="text-xs text-muted-foreground">
                Clear guidelines help creators produce work that aligns with your brand
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Publishing Settings */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30">
          <CardHeader>
            <CardTitle>Publishing Settings</CardTitle>
            <CardDescription>
              Control the visibility and availability of this IP kit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="isPublished">Published Status</Label>
                <p className="text-sm text-muted-foreground">
                  {watchedIsPublished 
                    ? "This IP kit is publicly available to creators"
                    : "This IP kit is saved as a draft and not visible to creators"
                  }
                </p>
              </div>
              <Switch
                id="isPublished"
                checked={watchedIsPublished}
                onCheckedChange={(checked) => setValue("isPublished", checked, { shouldDirty: true })}
              />
            </div>

            {watchedIsPublished && (
              <div className="bg-gradient-to-br from-blue-50/50 to-blue-100/50 border border-blue-200/50 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">
                      Publishing this IP kit
                    </p>
                    <p className="text-sm text-blue-700">
                      Once published, creators will be able to discover and use this IP kit in campaigns. 
                      Make sure you&apos;ve uploaded all necessary assets and reviewed your guidelines.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asset Summary */}
        {ipKit && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30">
            <CardHeader>
              <CardTitle>Asset Summary</CardTitle>
              <CardDescription>
                Overview of assets included in this IP kit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {ipKit.assetCount || 0} assets uploaded
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Assets are automatically included when uploaded to this IP kit
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Manage Assets
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </form>
  )
}