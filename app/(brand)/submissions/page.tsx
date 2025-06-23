import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Eye, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare,
  FileImage
} from "lucide-react"
import Link from "next/link"
import { SubmissionsFilters } from "./submissions-filters"
import { SubmissionQueueContainer } from "./submission-queue-container"
import { createSearchParams } from "@/lib/utils"
import { getSubmissionQueue, getReviewStats } from "@/lib/data/campaigns"

function getStatusColor(status: string) {
  switch (status) {
    case "approved":
      return "default"
    case "pending":
      return "secondary"
    case "rejected":
      return "destructive"
    default:
      return "secondary"
  }
}

function getStatusText(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatDate(date: string | Date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj)
}

export default async function BrandSubmissionsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const params = {
    search: Array.isArray(searchParams.search) ? searchParams.search[0] : searchParams.search,
    status: Array.isArray(searchParams.status) ? searchParams.status[0] : searchParams.status || 'pending',
    campaignId: Array.isArray(searchParams.campaignId) ? searchParams.campaignId[0] : searchParams.campaignId,
    sortBy: Array.isArray(searchParams.sortBy) ? searchParams.sortBy[0] : searchParams.sortBy,
    page: Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page || '1',
  }

  try {
    // Fetch submissions queue data and review statistics
    const [queueData, reviewStats] = await Promise.all([
      getSubmissionQueue(params),
      getReviewStats()
    ])
    
    const { submissions, pagination } = queueData

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve creator submissions across all campaigns
          </p>
        </div>
      </div>

      {/* Filters */}
      <SubmissionsFilters />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Submissions
            </CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Review
            </CardTitle>
            <Eye className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Across all campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats.approved}</div>
            <p className="text-xs text-muted-foreground">
              +{reviewStats.recentReviews} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats.rejected}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Withdrawn
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats.withdrawn}</div>
          </CardContent>
        </Card>
      </div>

      {/* Submission Queue with Selection */}
      <SubmissionQueueContainer submissions={submissions} />

      {/* Empty State */}
      {submissions.length === 0 && (
        <div className="text-center py-12">
          <FileImage className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No submissions found</h3>
          <p className="text-muted-foreground mb-4">
            {params.search || params.status !== 'all' 
              ? 'Try adjusting your filters to see more results.'
              : 'No submissions have been made yet.'
            }
          </p>
        </div>
      )}

      {/* Pagination */}
      {submissions.length > 0 && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
            <Button 
              key={page}
              variant={page === pagination.page ? "default" : "outline"} 
              size="sm"
              asChild
            >
              <Link href={`?${createSearchParams({ ...params, page: page.toString() }).toString()}`}>
                {page}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
  } catch (error) {
    console.error('Error loading submissions page:', error)
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Submissions</h1>
          <p className="text-muted-foreground mb-4">
            There was an error loading the submissions page. Please try again later.
          </p>
          <p className="text-sm text-muted-foreground">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }
}