"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubmissionWithDetails } from "@/types"
import { 
  ArrowLeft,
  Heart,
  Award,
  Users,
  Search
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StoryProtocolStatus, StoryProtocolLink } from "@/components/shared/story-protocol-link"

interface CampaignSubmissionsClientProps {
  campaign: any
  initialData: {
    submissions: any[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }
}

export function CampaignSubmissionsClient({ campaign, initialData }: CampaignSubmissionsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "")
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || "newest")

  const { submissions, pagination } = initialData

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (searchTerm) {
        params.set('search', searchTerm)
      } else {
        params.delete('search')
      }
      params.delete('page') // Reset to first page when searching
      
      // Only navigate if the search term has actually changed
      const currentSearch = searchParams.get('search') || ""
      if (searchTerm !== currentSearch) {
        router.push(`/discover/${campaign.id}/submissions?${params.toString()}`)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, searchParams, router, campaign.id])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const handleSortChange = (value: string) => {
    setSortBy(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set('sortBy', value)
    params.delete('page') // Reset to first page when sorting
    router.push(`/discover/${campaign.id}/submissions?${params.toString()}`)
  }

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`/discover/${campaign.id}/submissions?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Header with Back Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/discover/${campaign.id}`}>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Campaign
              </Button>
            </Link>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              All Approved Submissions
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              {campaign.title} • Community Showcase
            </p>
          </div>
        </div>

        {/* Search and Sort Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search submissions by title or creator..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="title">A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submissions Grid */}
        {submissions.length > 0 ? (
          <>
            {/* Results Count */}
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {submissions.length} approved submission{submissions.length !== 1 ? 's' : ''}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {submissions.map((submission) => (
                <Card key={submission.id} className="group hover:shadow-lg transition-all duration-200">
                  <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                    <img
                      src={submission.artworkUrl}
                      alt={submission.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-medium line-clamp-1">{submission.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        By {submission.creator?.displayName || 'Anonymous Creator'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        <Award className="mr-1 h-3 w-3" />
                        Approved
                      </Badge>
                      {submission.likeCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Heart className="mr-1 h-3 w-3" />
                          {submission.likeCount}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <StoryProtocolStatus 
                        ipId={submission.storyProtocolIpId}
                        submissionStatus={submission.status}
                      />
                      <StoryProtocolLink 
                        ipId={submission.storyProtocolIpId}
                        submissionStatus={submission.status}
                        variant="button"
                        size="sm"
                      />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : 'Unknown date'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const page = pagination.page <= 3 ? i + 1 : pagination.page - 2 + i
                    if (page > pagination.pages) return null
                    return (
                      <Button
                        key={page}
                        variant={page === pagination.page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </Button>
                    )
                  })}
                  {pagination.pages > 5 && pagination.page < pagination.pages - 2 && (
                    <span className="text-muted-foreground">...</span>
                  )}
                  {pagination.pages > 5 && pagination.page < pagination.pages - 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.pages)}
                    >
                      {pagination.pages}
                    </Button>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(Math.min(pagination.pages, pagination.page + 1))}
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Approved Submissions Yet
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? `No submissions found matching "${searchTerm}"`
                : "This campaign doesn't have any approved submissions yet. Be the first to create something amazing!"
              }
            </p>
            <Link href={`/discover/${campaign.id}`}>
              <Button>
                Back to Campaign
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}