"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Eye, 
  Copy, 
  Trash2,
  Package,
  Image,
  Users,
  Calendar
} from "lucide-react"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { useBrandPermissions } from "@/lib/hooks/use-brand-permissions"
import Link from "next/link"

interface IpKit {
  id: string
  name: string
  description?: string
  brandId: string
  isPublished: boolean
  version: number
  createdAt: string
  updatedAt: string
  brandName: string
  assetCount: number
}

export default function IpKitsPage() {
  const [ipKits, setIpKits] = useState<IpKit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [publishedFilter, setPublishedFilter] = useState("all")
  const [error, setError] = useState<string | null>(null)

  // Get brand permissions and user brands
  const { userBrands, loading: permissionsLoading } = useBrandPermissions()
  const currentBrand = userBrands[0] // Use first brand for now

  const fetchIpKits = async () => {
    if (!currentBrand) return

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.append('brandId', currentBrand.id)
      if (searchQuery) params.append('search', searchQuery)
      if (publishedFilter !== 'all') params.append('published', publishedFilter)

      const response = await fetch(`/api/ip-kits?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch IP kits')
      }

      const data = await response.json()
      setIpKits(data.ipKits)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load IP kits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!permissionsLoading && currentBrand) {
      fetchIpKits()
    }
  }, [searchQuery, publishedFilter, currentBrand, permissionsLoading])

  const handleDuplicate = async (ipKit: IpKit) => {
    // TODO: Implement duplication logic
    console.log('Duplicate IP kit:', ipKit.id)
  }

  const handleDelete = async (ipKitId: string) => {
    if (confirm('Are you sure you want to delete this IP kit? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/ip-kits/${ipKitId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          setIpKits(prev => prev.filter(kit => kit.id !== ipKitId))
        } else {
          console.error('Failed to delete IP kit')
        }
      } catch (error) {
        console.error('Error deleting IP kit:', error)
      }
    }
  }

  const stats = [
    {
      title: "Total IP Kits",
      value: ipKits.length.toString(),
      description: "All IP kits created",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      title: "Published",
      value: ipKits.filter(kit => kit.isPublished).length.toString(),
      description: "Live and available",
      icon: Eye,
      color: "text-green-600",
      bgColor: "bg-green-100"
    },
    {
      title: "Total Assets",
      value: ipKits.reduce((sum, kit) => sum + kit.assetCount, 0).toString(),
      description: "Across all kits",
      icon: Image,
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      title: "In Use",
      value: "0", // TODO: Count campaigns using these kits
      description: "Active campaigns",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (permissionsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
      </div>
    )
  }

  if (!currentBrand) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Brand Access</h3>
          <p className="text-muted-foreground mb-4">
            You need to be associated with a brand to manage IP kits.
          </p>
          <Button onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchIpKits} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">IP Kit Management</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your intellectual property kits for campaigns
          </p>
        </div>
        <Link href="/ip-kits/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create IP Kit
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <ErrorBoundary>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ErrorBoundary>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>IP Kits</CardTitle>
          <CardDescription>
            Manage your brand&apos;s intellectual property kits and assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search IP kits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={publishedFilter} onValueChange={setPublishedFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Published</SelectItem>
                <SelectItem value="false">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* IP Kits Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-full mb-4" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : ipKits.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No IP kits found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || publishedFilter !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Create your first IP kit to get started'}
              </p>
              {!searchQuery && publishedFilter === 'all' && (
                <Link href="/ip-kits/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First IP Kit
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ipKits.map((ipKit) => (
                <Card key={ipKit.id} className="group hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{ipKit.name}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ipKit.description || 'No description provided'}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/ip-kits/${ipKit.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/ip-kits/${ipKit.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(ipKit)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(ipKit.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Status and Stats */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {ipKit.isPublished ? (
                            <Badge variant="default" className="bg-green-600">
                              Published v{ipKit.version}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Draft</Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {ipKit.assetCount} assets
                        </span>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Updated {formatDate(ipKit.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}