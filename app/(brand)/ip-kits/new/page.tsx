"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { IpKitForm } from "@/components/ip-kits/ip-kit-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Package } from "lucide-react"
import { useBrandPermissions } from "@/lib/hooks/use-brand-permissions"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

type IpKitFormData = {
  name: string
  description?: string
  guidelines?: string
  isPublished: boolean
}

export default function NewIpKitPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Get brand permissions and user brands
  const { userBrands, loading: permissionsLoading } = useBrandPermissions()
  const currentBrand = userBrands[0] // Use first brand for now

  const handleSave = async (data: IpKitFormData) => {
    if (!currentBrand) {
      console.error('No brand available for IP kit creation')
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch('/api/ip-kits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          brandId: currentBrand.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create IP kit')
      }

      const newIpKit = await response.json()
      
      // Redirect to the new IP kit's detail page
      router.push(`/ip-kits/${newIpKit.id}`)
      
    } catch (error) {
      console.error('Error creating IP kit:', error)
      // TODO: Show error toast/notification
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/ip-kits')
  }

  if (permissionsLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!currentBrand) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center py-8">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Brand Access</h3>
          <p className="text-muted-foreground mb-4">
            You need to be associated with a brand to create IP kits.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/ip-kits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New IP Kit</h1>
          <p className="text-muted-foreground">
            Set up a new intellectual property kit for your campaigns
          </p>
        </div>
      </div>

      {/* Introduction Card */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>
            IP kits are collections of brand assets that creators can use in campaigns. 
            They include images, guidelines, and usage rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">1. Basic Information</h4>
              <p className="text-muted-foreground">
                Give your IP kit a clear name and description that creators will understand.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">2. Set Guidelines</h4>
              <p className="text-muted-foreground">
                Define how creators should use your assets, including style requirements and restrictions.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">3. Upload Assets</h4>
              <p className="text-muted-foreground">
                After creating your IP kit, you&apos;ll be able to upload and organize your brand assets.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IP Kit Form */}
      <IpKitForm
        brandId={currentBrand.id}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}