"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, cn } from "@/lib/utils"
import { useBookmarks } from "@/lib/hooks/use-bookmarks"
import { Search, Filter, Calendar, Users, Image, ArrowRight, Bookmark, SortAsc, SortDesc, X, BookmarkCheck } from "lucide-react"
import Link from "next/link"
import NextImage from "next/image"

interface Campaign {
  id: string
  title: string
  description: string
  brand_name: string
  status: string
  deadline: Date | null
  asset_count: number
  submission_count: number
  thumbnail_url: string
  featured?: boolean
}

interface Filters {
  search: string
  category: string
  status: string[]
  deadline: string
  assetCount: string
}

interface SortOption {
  field: string
  direction: 'asc' | 'desc'
  label: string
}

interface DiscoverClientProps {
  initialCampaigns: Campaign[]
  initialFeaturedCampaigns: Campaign[]
}

export default function DiscoverClient({ initialCampaigns, initialFeaturedCampaigns }: DiscoverClientProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [featuredCampaigns, setFeaturedCampaigns] = useState<Campaign[]>(initialFeaturedCampaigns)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState<Filters>({
    search: "",
    category: "all",
    status: ["active"],
    deadline: "all",
    assetCount: "all"
  })
  const [sortBy, setSortBy] = useState<SortOption>({
    field: "created_at",
    direction: "desc",
    label: "Newest First"
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Bookmark management
  const { bookmarks, isBookmarked, toggleBookmark } = useBookmarks()

  const sortOptions: SortOption[] = [
    { field: "created_at", direction: "desc", label: "Newest First" },
    { field: "created_at", direction: "asc", label: "Oldest First" },
    { field: "deadline", direction: "asc", label: "Deadline Soon" },
    { field: "deadline", direction: "desc", label: "Deadline Later" },
    { field: "submission_count", direction: "desc", label: "Most Popular" },
    { field: "submission_count", direction: "asc", label: "Least Popular" },
    { field: "title", direction: "asc", label: "A-Z" },
    { field: "title", direction: "desc", label: "Z-A" }
  ]

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "anime", label: "Anime" },
    { id: "gaming", label: "Gaming" },
    { id: "fantasy", label: "Fantasy" },
    { id: "cyberpunk", label: "Cyberpunk" },
    { id: "art", label: "Digital Art" },
    { id: "music", label: "Music" },
    { id: "video", label: "Video" }
  ]

  const statusOptions = [
    { id: "active", label: "Active" },
    { id: "draft", label: "Coming Soon" },
    { id: "closed", label: "Recently Closed" },
    { id: "bookmarked", label: "My Bookmarks" }
  ]

  const deadlineOptions = [
    { id: "all", label: "Any Deadline" },
    { id: "week", label: "Within a Week" },
    { id: "month", label: "Within a Month" },
    { id: "quarter", label: "Within 3 Months" },
    { id: "none", label: "No Deadline" }
  ]

  const assetCountOptions = [
    { id: "all", label: "Any Amount" },
    { id: "few", label: "1-5 Assets" },
    { id: "some", label: "6-15 Assets" },
    { id: "many", label: "16+ Assets" }
  ]

  // Debounced fetch function
  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      
      // Filter out bookmarked from status if it's included
      const statusFilters = filters.status.filter(s => s !== "bookmarked")
      const showBookmarked = filters.status.includes("bookmarked")
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        search: filters.search,
        status: statusFilters.length > 0 ? statusFilters.join(",") : "active",
        category: filters.category !== "all" ? filters.category : "",
        deadline: filters.deadline !== "all" ? filters.deadline : "",
        assetCount: filters.assetCount !== "all" ? filters.assetCount : "",
        sortBy: sortBy.field,
        sortDirection: sortBy.direction
      })

      const response = await fetch(`/api/campaigns?${params}`)
      if (response.ok) {
        const data = await response.json()
        let campaigns = data.campaigns
        
        // Filter to bookmarked campaigns if that filter is active
        if (showBookmarked) {
          campaigns = campaigns.filter((campaign: Campaign) => isBookmarked(campaign.id))
        }
        
        setCampaigns(campaigns)
        setTotalPages(Math.ceil(campaigns.length / 12)) // Recalculate pages for bookmarked filter
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filters, sortBy, isBookmarked])

  // Fetch campaigns when filters change
  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  const updateFilter = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const toggleStatusFilter = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status]
    updateFilter("status", newStatus)
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "all",
      status: ["active"],
      deadline: "all",
      assetCount: "all"
    })
    setSortBy({
      field: "created_at",
      direction: "desc",
      label: "Newest First"
    })
    setCurrentPage(1)
  }

  const hasActiveFilters = (
    filters.search !== "" ||
    filters.category !== "all" ||
    filters.status.length !== 1 || !filters.status.includes("active") ||
    filters.deadline !== "all" ||
    filters.assetCount !== "all" ||
    sortBy.field !== "created_at" || sortBy.direction !== "desc"
  )

  // Smart fallback for campaign thumbnails
  const getCampaignThumbnail = (campaign: Campaign) => {
    return campaign.thumbnail_url || null
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Discover Campaigns
          </h1>
          <p className="mt-2 text-base sm:text-lg text-muted-foreground">
            Find exciting creative opportunities from top brands
          </p>
        </div>

        {/* Featured Campaigns */}
        {featuredCampaigns.length > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">Featured Campaigns</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Curated opportunities from top brands</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 max-w-7xl mx-auto">
              {featuredCampaigns.map((campaign) => (
                <Link key={campaign.id} href={`/discover/${campaign.id}`} className="block h-full">
                  <Card className="group relative overflow-hidden border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 w-full h-full cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] flex flex-col">
                    <div className="absolute top-4 right-4 z-10">
                      <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-xs px-3 py-1 shadow-md border border-yellow-400">
                        ⭐ FEATURED
                      </Badge>
                    </div>
                    <CardHeader className="pt-12 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Badge variant="secondary">{campaign.brand_name}</Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {campaign.status}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors mb-2">
                            {campaign.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                            {campaign.description}
                          </CardDescription>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "transition-all duration-200 shrink-0 ml-2",
                            isBookmarked(campaign.id) 
                              ? "opacity-100 text-blue-600 hover:text-blue-700" 
                              : "opacity-0 group-hover:opacity-100 hover:text-blue-600"
                          )}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleBookmark(campaign.id)
                          }}
                        >
                          {isBookmarked(campaign.id) ? (
                            <BookmarkCheck className="h-4 w-4 fill-current" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="flex-1 flex flex-col space-y-4 pt-0">
                      {/* Campaign Stats */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{campaign.submission_count} submissions</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Image className="h-4 w-4" aria-hidden="true" />
                            <span>{campaign.asset_count} assets</span>
                          </div>
                        </div>
                      </div>

                      {/* Deadline */}
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Deadline:</span>
                        <span className="font-medium">
                          {campaign.deadline ? formatDate(new Date(campaign.deadline)) : "No deadline"}
                        </span>
                      </div>

                      {/* Thumbnail Preview */}
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden flex-1 relative">
                        {getCampaignThumbnail(campaign) ? (
                          <NextImage
                            src={getCampaignThumbnail(campaign)!}
                            alt={campaign.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 flex items-center justify-center">
                            <div className="text-center text-white p-4">
                              <h3 className="font-bold text-lg mb-2">{campaign.title}</h3>
                              <p className="text-sm opacity-90">by {campaign.brand_name}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 mt-auto">
                        <Button 
                          className="w-full text-sm bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 transition-all duration-200"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.location.href = `/discover/${campaign.id}`
                          }}
                        >
                          Join Featured Campaign
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6 sm:mb-8 space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns, brands, or keywords..."
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                className="pl-10 min-h-[44px] sm:min-h-[40px]"
              />
            </div>
            <div className="flex gap-2">
              <DropdownMenu open={showFilters} onOpenChange={setShowFilters}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto min-h-[44px] sm:min-h-[40px]">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                      <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">!</Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <DropdownMenuLabel>Filter Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <div className="p-4 space-y-4">
                    {/* Status Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <div className="space-y-2">
                        {statusOptions.map((status) => (
                          <DropdownMenuCheckboxItem
                            key={status.id}
                            checked={filters.status.includes(status.id)}
                            onCheckedChange={() => toggleStatusFilter(status.id)}
                          >
                            {status.label}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Select value={filters.category} onValueChange={(value) => updateFilter("category", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Deadline Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Deadline</label>
                      <Select value={filters.deadline} onValueChange={(value) => updateFilter("deadline", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {deadlineOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Asset Count Filter */}
                    <div>
                      <label className="text-sm font-medium mb-2 block">Asset Count</label>
                      <Select value={filters.assetCount} onValueChange={(value) => updateFilter("assetCount", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {assetCountOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="w-full"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Select value={`${sortBy.field}-${sortBy.direction}`} onValueChange={(value) => {
                const [field, direction] = value.split("-")
                const option = sortOptions.find(opt => opt.field === field && opt.direction === direction)
                if (option) setSortBy(option)
              }}>
                <SelectTrigger className="w-full sm:w-auto min-w-[160px] min-h-[44px] sm:min-h-[40px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={`${option.field}-${option.direction}`} value={`${option.field}-${option.direction}`}>
                      <div className="flex items-center gap-2">
                        {option.direction === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {filters.search && (
                <Badge variant="secondary" className="gap-1">
                  Search: {filters.search}
                  <button onClick={() => updateFilter("search", "")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filters.category !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find(c => c.id === filters.category)?.label}
                  <button onClick={() => updateFilter("category", "all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {(filters.status.length !== 1 || !filters.status.includes("active")) && (
                filters.status.map(status => (
                  <Badge key={status} variant="secondary" className="gap-1">
                    {statusOptions.find(s => s.id === status)?.label}
                    <button onClick={() => toggleStatusFilter(status)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
              {(sortBy.field !== "created_at" || sortBy.direction !== "desc") && (
                <Badge variant="secondary" className="gap-1">
                  Sort: {sortBy.label}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Campaign Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 max-w-7xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse w-full h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-12" />
                      </div>
                      <Skeleton className="h-6 w-3/4" />
                    </div>
                    <Skeleton className="h-8 w-8" />
                  </div>
                  <Skeleton className="h-12 w-full" />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden flex-1">
                    <Skeleton className="w-full h-full" />
                  </div>
                  <div className="pt-2 mt-auto">
                    <Skeleton className="h-10 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 max-w-7xl mx-auto">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/discover/${campaign.id}`} className="block h-full">
                <Card className="campaign-card group w-full h-full cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary">{campaign.brand_name}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {campaign.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl leading-tight group-hover:text-primary transition-colors mb-2">
                          {campaign.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-sm leading-relaxed">
                          {campaign.description}
                        </CardDescription>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "transition-all duration-200 shrink-0 ml-2",
                          isBookmarked(campaign.id) 
                            ? "opacity-100 text-blue-600 hover:text-blue-700" 
                            : "opacity-0 group-hover:opacity-100 hover:text-blue-600"
                        )}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleBookmark(campaign.id)
                        }}
                      >
                        {isBookmarked(campaign.id) ? (
                          <BookmarkCheck className="h-4 w-4 fill-current" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 flex flex-col space-y-4 pt-0">
                    {/* Campaign Stats */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{campaign.submission_count} submissions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Image className="h-4 w-4" aria-hidden="true" />
                          <span>{campaign.asset_count} assets</span>
                        </div>
                      </div>
                    </div>

                    {/* Deadline */}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Deadline:</span>
                      <span className="font-medium">
                        {campaign.deadline ? formatDate(new Date(campaign.deadline)) : "No deadline"}
                      </span>
                    </div>

                    {/* Thumbnail Preview */}
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden flex-1 relative">
                      {getCampaignThumbnail(campaign) ? (
                        <NextImage
                          src={getCampaignThumbnail(campaign)!}
                          alt={campaign.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 flex items-center justify-center">
                          <div className="text-center text-white p-4">
                            <h3 className="font-bold text-lg mb-2">{campaign.title}</h3>
                            <p className="text-sm opacity-90">by {campaign.brand_name}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 mt-auto">
                      <Button 
                        className="w-full text-sm transition-all duration-200"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.location.href = `/discover/${campaign.id}`
                        }}
                      >
                        Join Campaign
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && campaigns.length === 0 && (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No campaigns found
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters to find more campaigns.
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && campaigns.length > 0 && (
          <div className="mt-8 sm:mt-12 flex items-center justify-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i
                if (page > totalPages) return null
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="text-muted-foreground">...</span>
              )}
              {totalPages > 5 && currentPage < totalPages - 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
        {/* Results Count */}
        {!loading && campaigns.length > 0 && (
          <div className="mt-6 sm:mt-8 text-center text-sm text-muted-foreground">
            Showing page {currentPage} of {totalPages} ({campaigns.length} campaigns)
          </div>
        )}
      </div>
    </div>
  )
}