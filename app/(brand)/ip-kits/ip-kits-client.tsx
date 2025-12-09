"use client"

import {useState, useCallback, useMemo} from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Badge} from "@/components/ui/badge"
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
  Calendar,
} from "lucide-react"
import {ErrorBoundary} from "@/components/ui/error-boundary"
import Link from "next/link"

interface IpKit {
  id: string
  name: string
  description?: string
  published: boolean
  brand_name: string
  asset_count: number
  created_at: Date
  updated_at: Date
}

interface IpKitsClientProps {
  ipKits: IpKit[]
  brandName: string
}

export default function IpKitsClient({ipKits, brandName}: IpKitsClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [publishedFilter, setPublishedFilter] = useState("all")

  // Filter IP kits based on search and filter criteria
  const filteredIpKits = useMemo(() => {
    let filtered = ipKits

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        kit =>
          kit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          kit.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply published filter
    if (publishedFilter !== "all") {
      const isPublished = publishedFilter === "true"
      filtered = filtered.filter(kit => kit.published === isPublished)
    }

    return filtered
  }, [ipKits, searchQuery, publishedFilter])

  // Calculate stats
  const stats = useMemo(
    () => [
      {
        title: "Total IP Kits",
        value: ipKits.length.toString(),
        description: "All IP kits created",
        icon: Package,
      },
      {
        title: "Published",
        value: ipKits.filter(kit => kit.published).length.toString(),
        description: "Live and available",
        icon: Eye,
      },
      {
        title: "Total Assets",
        value: ipKits.reduce((sum, kit) => sum + kit.asset_count, 0).toString(),
        description: "Across all kits",
        icon: Image,
      },
      {
        title: "In Use",
        value: "0", // TODO: Count campaigns using these kits
        description: "Active campaigns",
        icon: Users,
      },
    ],
    [ipKits]
  )

  const handleDuplicate = useCallback(async (ipKit: IpKit) => {
    // TODO: Implement duplication logic
    console.log("Duplicate IP kit:", ipKit.id)
  }, [])

  const handleDelete = useCallback(async (ipKitId: string) => {
    if (
      confirm(
        "Are you sure you want to delete this IP kit? This action cannot be undone."
      )
    ) {
      try {
        const response = await fetch(`/api/ip-kits/${ipKitId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          // Refresh the page to update the list
          window.location.reload()
        } else {
          console.error("Failed to delete IP kit")
        }
      } catch (error) {
        console.error("Error deleting IP kit:", error)
      }
    }
  }, [])

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  return (
    <div className='container mx-auto py-8 space-y-8'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>IP Kit Management</h1>
          <p className='text-muted-foreground mt-2'>
            Create and manage your intellectual property kits for campaigns
          </p>
        </div>
        <Link href='/ip-kits/new'>
          <Button variant='gradient'>
            <Plus className='mr-2 h-4 w-4' />
            Create IP Kit
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <ErrorBoundary>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {stats.map((stat, index) => {
            const gradientClasses = [
              "from-gradient-blue to-gradient-cyan",
              "from-green-500 to-emerald-500",
              "from-gradient-purple to-gradient-pink",
              "from-orange-500 to-red-500",
            ]
            return (
              <Card
                key={stat.title}
                className='border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'
              >
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium text-muted-foreground'>
                    {stat.title}
                  </CardTitle>
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${gradientClasses[index]} backdrop-blur-sm border border-white/20 shadow-lg`}
                  >
                    <stat.icon className='h-4 w-4 text-white' />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold bg-gradient-to-br ${gradientClasses[index]} bg-clip-text text-transparent`}
                  >
                    {stat.value}
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ErrorBoundary>

      {/* Main Content */}
      <div className='space-y-6'>
        {/* Section Header */}
        <div>
          <h2 className='text-2xl font-semibold mb-2'>IP Kits</h2>
          <p className='text-muted-foreground'>
            Manage your brand&apos;s intellectual property kits and assets
          </p>
        </div>

        {/* Filters */}
        <div className='flex flex-col sm:flex-row gap-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search IP kits...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>
          <Select value={publishedFilter} onValueChange={setPublishedFilter}>
            <SelectTrigger className='w-full sm:w-48'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Status</SelectItem>
              <SelectItem value='true'>Published</SelectItem>
              <SelectItem value='false'>Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* IP Kits Grid */}
        {filteredIpKits.length === 0 ? (
          <div className='text-center py-12'>
            <Package className='mx-auto h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-medium mb-2'>No IP kits found</h3>
            <p className='text-muted-foreground mb-4'>
              {searchQuery || publishedFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first IP kit to get started"}
            </p>
            {!searchQuery && publishedFilter === "all" && (
              <Link href='/ip-kits/new'>
                <Button variant='gradient'>
                  <Plus className='mr-2 h-4 w-4' />
                  Create Your First IP Kit
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {filteredIpKits.map(ipKit => (
              <Card
                key={ipKit.id}
                className='group border-0 shadow-lg bg-gradient-to-br from-card via-card to-muted/30 hover:shadow-xl transition-all duration-300'
              >
                <CardContent className='p-6'>
                  <div className='space-y-4'>
                    {/* Header */}
                    <div className='flex items-start justify-between'>
                      <div className='space-y-1 flex-1 min-w-0'>
                        <h3 className='font-semibold truncate'>{ipKit.name}</h3>
                        <p className='text-sm text-muted-foreground line-clamp-2'>
                          {ipKit.description || "No description provided"}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='opacity-0 group-hover:opacity-100 transition-opacity'
                          >
                            <MoreVertical className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem asChild>
                            <Link href={`/ip-kits/${ipKit.id}`}>
                              <Eye className='mr-2 h-4 w-4' />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/ip-kits/${ipKit.id}/edit`}>
                              <Edit className='mr-2 h-4 w-4' />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(ipKit)}
                          >
                            <Copy className='mr-2 h-4 w-4' />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(ipKit.id)}
                            className='text-destructive'
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Status and Stats */}
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        {ipKit.published ? (
                          <Badge
                            variant='default'
                            className='bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0'
                          >
                            Published
                          </Badge>
                        ) : (
                          <Badge
                            variant='secondary'
                            className='bg-gradient-to-r from-gradient-purple/20 to-gradient-pink/20 border-0'
                          >
                            Draft
                          </Badge>
                        )}
                      </div>
                      <span className='text-sm text-muted-foreground'>
                        {ipKit.asset_count} assets
                      </span>
                    </div>

                    {/* Footer */}
                    <div className='flex items-center justify-between text-xs text-muted-foreground pt-2 border-t'>
                      <div className='flex items-center space-x-1'>
                        <Calendar className='h-3 w-3' />
                        <span>Updated {formatDate(ipKit.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
